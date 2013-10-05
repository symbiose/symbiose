<?php
namespace lib;

/**
 * The HTTP request.
 * @author Simon Ser
 * @since 1.0beta3
 */
class HTTPRequest {
	/**
	 * Get a cookie's content.
	 * @param string $key The cookie's name.
	 * @return string The cookie's content.
	 */
	public function cookieData($key)
	{
		return isset($_COOKIE[$key]) ? $_COOKIE[$key] : null;
	}

	/**
	 * Determine if a cookie exists.
	 * @param string $key The cookie's name.
	 * @return bool True if it exists, false otherwise.
	 */
	public function cookieExists($key)
	{
		return isset($_COOKIE[$key]);
	}

	/**
	 * Get this request's GET data.
	 * @param string $key The data name.
	 * @return string The data's content.
	 */
	public function getData($key)
	{
		return isset($_GET[$key]) ? $_GET[$key] : null;
	}

	/**
	 * Determine if a GET data exists.
	 * @param string $key The data name.
	 * @return bool True if the data exists, false otherwise.
	 */
	public function getExists($key)
	{
		return isset($_GET[$key]);
	}

	/**
	 * Get this request's POST data.
	 * @param string $key The data name.
	 * @return string The data's content.
	 */
	public function postData($key)
	{
		return isset($_POST[$key]) ? $_POST[$key] : null;
	}

	/**
	 * Determine if a POST data exists.
	 * @param string $key The data name.
	 * @return bool True if the data exists, false otherwise.
	 */
	public function postExists($key)
	{
		return isset($_POST[$key]);
	}

	/**
	 * Get this request's URI.
	 * @return string
	 */
	public function requestURI()
	{
		return $_SERVER['REQUEST_URI'];
	}
}