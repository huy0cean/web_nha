@echo off
echo Dang tao cau truc thu muc cho du an nhathuocgb...
echo.

REM --- 1. TAO THU MUC (FOLDERS) ---
echo Dang tao cac thu muc...
md "frontend\admin"
md "frontend\assets\css"
md "frontend\assets\js"
md "frontend\assets\images"
md "frontend\components"
md "backend\api"
md "uploads\products"
md "uploads\avatars"
echo   [OK] Da tao xong thu muc.
echo.

REM --- 2. TAO FILE RONG (FILES) ---
echo Dang tao cac file rong...

REM --- Frontend ---
type nul > "frontend\index.html"
type nul > "frontend\products.html"
type nul > "frontend\product-detail.html"
type nul > "frontend\cart.html"
type nul > "frontend\checkout.html"
type nul > "frontend\login.html"
type nul > "frontend\profile.html"
type nul > "frontend\admin\index.html"
type nul > "frontend\admin\login.html"
type nul > "frontend\assets\css\style.css"
type nul > "frontend\assets\css\admin.css"
type nul > "frontend\assets\js\app.js"
type nul > "frontend\assets\js\admin.js"
type nul > "frontend\components\header.html"
type nul > "frontend\components\footer.html"

REM --- Backend ---
type nul > "backend\config\helpers.php"
type nul > "backend\api\auth.php"
type nul > "backend\api\products.php"
type nul > "backend\api\cart.php"
type nul > "backend\api\orders.php"
type nul > "backend\api\categories.php"
type nul > "backend\.htaccess"

echo   [OK] Da tao xong cac file.
echo.
echo === HOAN THANH! ===
echo.
pause