<?php
require_once('../boot/ini.php');

//try {
	$api = new lib\ApiGroup;
	$api->render();
//} catch (Exception $e) {
//	lib\Error::catchException($e);
//}