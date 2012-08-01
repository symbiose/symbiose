<?php
namespace lib;

use \RuntimeException;

/**
 * ServerCallRequest represente la requete d'un script JavaScript pour executer une methode PHP.
 * @author $imon
 * @version 1.0
 */
class ServerCallRequest extends HTTPRequest {
	/**
	 * Classe demandee dans la requete.
	 * @var string
	 */
	protected $class;
	/**
	 * Methode demandee dans la requete.
	 * @var string
	 */
	protected $method;
	/**
	 * Arguments envoyes a la methode.
	 * @var array
	 */
	protected $args;

	/**
	 * Nom d'utilisateur specifie pour executer l'action.
	 * @var string
	 */
	protected $username;
	/**
	 * Mot de passe specifie pour executer l'action.
	 * @var string
	 */
	protected $password;

	/**
	 * ID du processus specifie pour executer l'action.
	 * @var int
	 */
	protected $pid;
	/**
	 * Clef du processus specifie pour executer l'action.
	 * @var string
	 */
	protected $key;

	/**
	 * Initialise la requete HTTP.
	 */
	public function __construct() {
		if (!$this->postExists('class') && !$this->getExists('class')) //Si la classe n'est pas specifiee
			throw new RuntimeException('Param&egrave;tre "class" manquant dans la requ&ecirc;te HTTP');
		$this->class = ($this->postExists('class')) ? $this->postData('class') : $this->getData('class');

		if (!$this->postExists('method') && !$this->getExists('method')) //Si la methode n'est pas specifiee
			throw new RuntimeException('Param&egrave;tre "method" manquant dans la requ&ecirc;te HTTP');
		$this->method = ($this->postExists('method')) ? $this->postData('method') : $this->getData('method');

		if (!$this->postExists('arguments') && !$this->getExists('method')) //Si les arguments ne sont pas specifies
			throw new RuntimeException('Param&egrave;tre "arguments" manquant dans la requ&ecirc;te HTTP');
		$args = ($this->postExists('arguments')) ? $this->postData('arguments') : $this->getData('arguments');
		if (strpos($this->postData('arguments'), '\\') !== false && json_decode($args) === null) {
			$args = stripslashes($args);
		}
		if (json_decode($args) === null) {
			$args = urldecode($args);
		}

		$this->args = array_values((array) json_decode($args, true));

		//Si on a fourni un mot de passe ou un nom d'utilisateur
		if ($this->postExists('password') && $this->getExists('password'))
			$this->password = ($this->postExists('password')) ? $this->postData('password') : $this->getData('password');
		if ($this->postExists('username') && $this->getExists('username'))
			$this->username = ($this->postExists('username')) ? $this->postData('username') : $this->getData('username');
		//Si on a fourni un pid et une clef
		if ($this->postExists('pid') && $this->getExists('pid'))
			$this->pid = (int) ($this->postExists('pid')) ? $this->postData('pid') : $this->getData('pid');
		if ($this->postExists('key') && $this->getExists('key'))
			$this->key = ($this->postExists('key')) ? $this->postData('key') : $this->getData('key');
	}

	/**
	 * Recuperer le nom de la classe demandee dans la requete.
	 * @return string Le nom de la classe.
	 */
	public function getClass() {
		return $this->class;
	}

	/**
	 * Recuperer la methode demandee dans la requete.
	 * @return string Le nom de la methode.
	 */
	public function getMethod() {
		return $this->method;
	}

	/**
	 * Recuperer les arguments a envoyer a la methode.
	 * @return array Un tableau contenant les arguemnts a envoyer.
	 */
	public function getArguments() {
		return $this->args;
	}

	/**
	 * Recuperer le mot de passe specifie.
	 * @return string Le mot de passe.
	 */
	public function getPassword() {
		return $this->password;
	}

	/**
	 * Recuperer le nom d'utilisateur specifie.
	 * @return string Le nom d'utilisateur.
	 */
	public function getUsername() {
		return $this->username;
	}

	/**
	 * Recuperer l'id du processus specifie.
	 * @return int L'id du processus.
	 */
	public function getPid() {
		return $this->pid;
	}

	/**
	 * Recuperer la clef du processus specifiee.
	 * @return string La clef du processus.
	 */
	public function getKey() {
		return $this->key;
	}
}
