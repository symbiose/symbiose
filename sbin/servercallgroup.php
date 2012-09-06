<?php
//On initialise tout
require_once('../boot/ini.php');

//On initialise la requete
try {
	$serverCallGroup = new lib\ServerCallGroup(new lib\ServerCallGroupRequest, new lib\ServerCallGroupResponse);
} catch (Exception $e) {
	lib\Error::catchException($e);
}

//On execute la requete
try {
	$serverCallGroup->run();
} catch (Exception $e) {
	lib\Error::catchException($e);
}