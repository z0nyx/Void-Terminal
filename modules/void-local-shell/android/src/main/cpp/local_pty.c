// Real local shell for Android without root: allocate a PTY (/dev/ptmx),
// fork, and exec /system/bin/sh attached to the slave side. Android's
// bionic libc has no forkpty(3) convenience wrapper (that's glibc-only),
// so this hand-rolls the same openpty+fork+login_tty sequence.
//
// Safety note: after fork(), the child is a single thread cloned from a
// multi-threaded JVM process. Only async-signal-safe, plain POSIX calls
// are safe there — no JNIEnv calls, no malloc via JNI-touched state. So
// every JNI string/array is converted to plain C memory (strdup'd char*)
// BEFORE fork() is called; the child touches only that pre-built memory
// and libc.

#include <jni.h>
#include <errno.h>
#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/wait.h>
#include <termios.h>
#include <unistd.h>

static char **build_c_array(JNIEnv *env, jobjectArray arr, int *out_len) {
  int len = (*env)->GetArrayLength(env, arr);
  char **out = (char **) calloc((size_t) len + 1, sizeof(char *));
  for (int i = 0; i < len; i++) {
    jstring s = (jstring) (*env)->GetObjectArrayElement(env, arr, i);
    const char *chars = (*env)->GetStringUTFChars(env, s, NULL);
    out[i] = strdup(chars);
    (*env)->ReleaseStringUTFChars(env, s, chars);
    (*env)->DeleteLocalRef(env, s);
  }
  out[len] = NULL;
  *out_len = len;
  return out;
}

static void free_c_array(char **arr, int len) {
  if (!arr) return;
  for (int i = 0; i < len; i++) free(arr[i]);
  free(arr);
}

JNIEXPORT jint JNICALL
Java_expo_modules_voidlocalshell_LocalPty_forkPty(
    JNIEnv *env, jobject thiz,
    jstring j_cmd, jobjectArray j_args, jobjectArray j_env, jstring j_cwd,
    jint rows, jint cols, jintArray j_pid_out) {
  (void) thiz;

  const char *cmd_chars = (*env)->GetStringUTFChars(env, j_cmd, NULL);
  char *cmd = strdup(cmd_chars);
  (*env)->ReleaseStringUTFChars(env, j_cmd, cmd_chars);

  char *cwd = NULL;
  if (j_cwd != NULL) {
    const char *cwd_chars = (*env)->GetStringUTFChars(env, j_cwd, NULL);
    cwd = strdup(cwd_chars);
    (*env)->ReleaseStringUTFChars(env, j_cwd, cwd_chars);
  }

  int argc = 0, envc = 0;
  char **argv = build_c_array(env, j_args, &argc);
  char **envp = build_c_array(env, j_env, &envc);

  int master_fd = open("/dev/ptmx", O_RDWR | O_CLOEXEC);
  if (master_fd < 0) {
    free(cmd); free(cwd); free_c_array(argv, argc); free_c_array(envp, envc);
    return -1;
  }
  if (grantpt(master_fd) != 0 || unlockpt(master_fd) != 0) {
    close(master_fd);
    free(cmd); free(cwd); free_c_array(argv, argc); free_c_array(envp, envc);
    return -1;
  }
  char pts_name[128];
  if (ptsname_r(master_fd, pts_name, sizeof(pts_name)) != 0) {
    close(master_fd);
    free(cmd); free(cwd); free_c_array(argv, argc); free_c_array(envp, envc);
    return -1;
  }

  struct winsize sz;
  memset(&sz, 0, sizeof(sz));
  sz.ws_row = (unsigned short) rows;
  sz.ws_col = (unsigned short) cols;
  ioctl(master_fd, TIOCSWINSZ, &sz);

  pid_t pid = fork();
  if (pid == 0) {
    // --- child: POSIX/libc only from here on, no JNI ---
    setsid();
    int slave_fd = open(pts_name, O_RDWR);
    if (slave_fd < 0) _exit(127);
    ioctl(slave_fd, TIOCSCTTY, 0);
    dup2(slave_fd, 0);
    dup2(slave_fd, 1);
    dup2(slave_fd, 2);
    if (slave_fd > 2) close(slave_fd);
    close(master_fd);
    if (cwd != NULL) chdir(cwd);
    execve(cmd, argv, envp);
    _exit(127);
  }

  // --- parent ---
  free(cmd);
  free(cwd);
  free_c_array(argv, argc);
  free_c_array(envp, envc);

  if (pid < 0) {
    close(master_fd);
    return -1;
  }

  jint pid32 = (jint) pid;
  (*env)->SetIntArrayRegion(env, j_pid_out, 0, 1, &pid32);
  return master_fd;
}

JNIEXPORT void JNICALL
Java_expo_modules_voidlocalshell_LocalPty_setWindowSize(
    JNIEnv *env, jobject thiz, jint fd, jint rows, jint cols) {
  (void) env; (void) thiz;
  struct winsize sz;
  memset(&sz, 0, sizeof(sz));
  sz.ws_row = (unsigned short) rows;
  sz.ws_col = (unsigned short) cols;
  ioctl(fd, TIOCSWINSZ, &sz);
}

JNIEXPORT jint JNICALL
Java_expo_modules_voidlocalshell_LocalPty_waitFor(JNIEnv *env, jobject thiz, jint pid) {
  (void) env; (void) thiz;
  int status = 0;
  if (waitpid((pid_t) pid, &status, 0) < 0) return -1;
  if (WIFEXITED(status)) return WEXITSTATUS(status);
  if (WIFSIGNALED(status)) return 128 + WTERMSIG(status);
  return -1;
}
