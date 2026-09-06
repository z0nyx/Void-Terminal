cmake_minimum_required(VERSION 3.22)
project(voidlocalshell C)

add_library(voidlocalshell SHARED local_pty.c)

find_library(log-lib log)

target_link_libraries(voidlocalshell ${log-lib})
