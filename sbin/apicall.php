<?php
require_once('../boot/ini.php');

//try {
	$api = new lib\Api;
	$api->render();
//} catch (Exception $e) {
//	lib\Error::catchException($e);
//}