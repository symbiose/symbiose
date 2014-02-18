<?php
//Let's init all
require('./boot/ini.php');

$ui = new lib\UserInterfaceBooter; //Create an interface booter
$ui->render(); //Run the interface booter