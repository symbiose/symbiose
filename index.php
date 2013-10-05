<?php
//Let's init all
require_once('./boot/ini.php');

try {
	$ui = new lib\UserInterfaceBooter; //Create an interface booter
	$ui->render(); //Run the interface booter
} catch (Exception $e) {
	lib\Error::catchException($e);
}