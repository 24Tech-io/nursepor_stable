@echo off
C:\Windows\System32\curl.exe -v -c cookies.txt -H "Content-Type: application/json" -d @login.json http://localhost:3000/api/auth/admin-login > response.json 2>&1
