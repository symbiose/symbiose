<?php
//On initialise tout
require_once('../boot/ini.php');

//On initialise la requete
try {
	$serverCall = new lib\ServerCall;
} catch (Exception $e) {
	lib\Error::catchException($e);
}

//On execute la requete
try {
	$serverCall->run();
} catch (Exception $e) {
	lib\Error::catchException($e);
}