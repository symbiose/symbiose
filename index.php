<?php
//On initialise tout
require_once('./boot/ini.php');

//On initialise le lanceur d'interface utilisateur
try {
	$ui = new lib\UserInterfaceBooter;
} catch (Exception $e) {
	lib\Error::catchException($e);
}

//On execute le lanceur d'interface utilisateur
try {
	$ui->run();
} catch (Exception $e) {
	lib\Error::catchException($e);
}