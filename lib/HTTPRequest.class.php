<?php
namespace lib;

/**
 * HTTPRequest represente la requete HTTP
 * @author $imon
 * @version 1.0
 */
class HTTPRequest {
	/**
	 * Recuperer le contenu d'un cookie.
	 * @param string $key La clef du cookie.
	 */
	public function cookieData($key)
	{
		return isset($_COOKIE[$key]) ? $_COOKIE[$key] : null;
	}

	/**
	 * Verifier si un cookie existe.
	 * @param string $key La clef du cookie.
	 */
	public function cookieExists($key)
	{
		return isset($_COOKIE[$key]);
	}

	/**
	 * Recuperer le contenu des informations de la requete de type GET
	 * @param string $key La clef de l'information.
	 */
	public function getData($key)
	{
		return isset($_GET[$key]) ? $_GET[$key] : null;
	}

	/**
	 * Verifier si une information de type GET existe
	 * @param string $key La clef de l'information.
	 */
	public function getExists($key)
	{
		return isset($_GET[$key]);
	}

	/**
	 * Recuperer le contenu des informations de la requete de type POST
	 * @param string $key La clef de l'information.
	 */
	public function postData($key)
	{
		return isset($_POST[$key]) ? $_POST[$key] : null;
	}

	/**
	 * Verifier si une information de type POST existe
	 * @param string $key La clef de l'information.
	 */
	public function postExists($key)
	{
		return isset($_POST[$key]);
	}

	/**
	 * Recuperer l'URI de la requete.
	 * @return L'URI.
	 */
	public function requestURI()
	{
		return $_SERVER['REQUEST_URI'];
	}
}