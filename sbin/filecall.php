<?php
//On initialise tout
require_once('../boot/ini.php');

//On initialise la requete
try {
	$fileCall = new lib\FileCall;
} catch (Exception $e) {
	lib\Error::catchException($e);
}

//On execute la requete
try {
	$fileCall->run();
} catch (Exception $e) {
	lib\Error::catchException($e);
}