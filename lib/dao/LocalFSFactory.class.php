<?php
namespace lib\dao;

class LocalFSFactory {
	public static function getLocalConnexion(array $config, \lib\Application $app) {
		$user = $app->user();

		$fs = new localfs\LocalFs();

		if ($user->isLogged()) {
			$fs->setAlias('~', './home/'.$user->username().'/');
		}

		return $fs;
	}
}