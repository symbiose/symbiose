<?php
namespace lib\dao;

class SessionProvider {
	public static function getSession(array $config, \lib\Application $app) {
		return $app->httpRequest()->session();
	}
}