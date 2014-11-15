<?php

namespace Wrappers;

/**
 * A stream wrapper.
 * @see http://php.net/manual/en/class.streamwrapper.php
 * @author emersion <contact@emersion.fr>
 */
abstract class Stream {
	protected static $protocol = '';
	protected static $defaultPort = -1;

	protected static $registered = false;
	protected static $connections = array();

	public static function is_registered() {
		return static::$registered;
	}

	public static function register() {
		if (in_array(static::$protocol, stream_get_wrappers())) {
			stream_wrapper_unregister(static::$protocol);
		}
		stream_wrapper_register(static::$protocol, get_called_class(), STREAM_IS_URL);
		static::$registered = true;
	}

	public static function unregister() {
		stream_wrapper_restore(static::$protocol);
		static::$registered = false;
	}

	public static function close_all() {
		foreach (static::$connections as $conn) {
			static::conn_close($conn);
		}
	}

	protected static function parse_url($url) {
		$data = parse_url($url);
		$data = array_merge(array(
			'host' => '',
			'port' => static::$defaultPort,
			'user' => '',
			'pass' => ''
		), $data);
		$data['user'] = urldecode($data['user']);
		$data['pass'] = urldecode($data['pass']);
		return $data;
	}

	protected static function conn_id($urlData) {
		$connId = $urlData['host'];
		if (!empty($urlData['port'])) {
			$connId .= ':'.$urlData['port'];
		}
		if (!empty($urlData['user'])) {
			if (!empty($urlData['pass'])) {
				$connId = $urlData['user'].':'.$urlData['pass'].'@'.$connId;
			} else {
				$connId = $urlData['user'].'@'.$connId;
			}
		}
		return $connId;
	}

	protected static function conn_get($url) {
		$urlData = static::parse_url($url);
		$connId = static::conn_id($urlData);

		if (isset(static::$connections[$connId])) {
			return static::$connections[$connId];
		}

		if (($conn = static::conn_new($urlData)) === false) {
			return false;
		}

		static::$connections[$connId] = $conn;
		return $conn;
	}

	abstract protected static function conn_new($urlData);
	abstract protected static function conn_close($conn);

	/**
	 * Open a new connection.
	 * @param  string $url The URL.
	 * @return bool        True on success, false on failure.
	 */
	protected function conn_open($url) {
		$this->url = $url;

		$conn = static::conn_get($url);
		if ($conn === false) {
			return false;
		}

		$this->conn = $conn;
		return true;
	}
}