@echo off
echo 正在创建前端项目结构...

:: 创建目录结构
mkdir src\components\Layout
mkdir src\components\Questions
mkdir src\components\Quiz
mkdir src\components\WrongBook
mkdir src\components\Stats
mkdir src\components\Common
mkdir src\pages
mkdir src\hooks
mkdir src\store
mkdir src\types
mkdir src\api
mkdir src\styles
mkdir src\utils
mkdir public

:: 创建配置文件
echo. > vite.config.ts
echo. > tsconfig.json
echo. > tsconfig.node.json
echo. > tailwind.config.js
echo. > postcss.config.js
echo. > index.html

echo 项目结构创建完成！
pause