<?php
namespace lib;

/**
 * ServerCallRequest represente la requete d'un script JavaScript pour executer une methode PHP.
 * @author $imon
 * @version 1.0
 */
class ServerCallGroupRequest extends HTTPRequest {
	/**
	 * Liste des requetes.
	 * @var array
	 */
	protected $requests = array();

	/**
	 * Initialise la requete HTTP.
	 */
	public function __construct() {
		$requestsStr = ($this->postExists('requests')) ? $this->postData('requests') : $this->getData('requests');
		if (strpos($this->postData('requests'), '\\') !== false && json_decode($requestsStr) === null) {
			$requestsStr = stripslashes($requestsStr);
		}
		if (json_decode($requestsStr) === null) {
			$requestsStr = urldecode($requestsStr);
		}

		$requests = (array) json_decode($requestsStr, true);

		foreach ($requests as $index => $request) {
			$this->requests[$index] = new ServerCallGroupRequestItem(array(
				'class' => $request['class'],
				'method' => $request['method'],
				'arguments' => (array_key_exists('arguments', $request)) ? (array) $request['arguments'] : array(),
				'username' => (array_key_exists('username', $request)) ? (string) $request['username'] : null,
				'password' => (array_key_exists('password', $request)) ? (string) $request['password'] : null,
				'pid' => (array_key_exists('pid', $request)) ? (int) $request['pid'] : null,
				'key' => (array_key_exists('key', $request)) ? (string) $request['key'] : null
			));
		}
	}

	/**
	 * Recuperer le nom de la classe demandee dans la requete.
	 * @return string Le nom de la classe.
	 */
	public function getRequests() {
		return $this->requests;
	}
}
