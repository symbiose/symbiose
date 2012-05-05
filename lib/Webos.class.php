<?php
namespace lib;

/**
 * Webos represente le webos.
 * @author $imon
 * @version 1.0
 */
abstract class Webos {
	/**
	 * La requete HTTP.
	 * @var HTTPRequest
	 */
	protected $httpRequest;
	/**
	 * La reponse HTTP.
	 * @var HTTPResponse
	 */
	protected $httpResponse;
	/**
	 * L'utilisateur courant.
	 * @var User
	 */
	protected $user;

	/**
	 * Initialiser le webos.
	 */
	public function __construct() {
		//On charge la requete et la reponse HTTP
		$this->httpRequest = new HTTPRequest;
		$this->httpResponse = new HTTPResponse;
		$this->managers = new Managers($this);

		//On envoie l'instance au gestionnaire d'erreurs
		Error::setErrorsWebos($this);

		//Si l'utilisateur est en session
		if ($this->managers()->get('User')->isRemembered())
			$this->user = $this->managers()->get('User')->getRemembered(); //On le recupere
		else
			$this->user = new models\User($this); //Sinon on initialise l'utilisateur
	}

	/**
	 * Recuperer la requete HTTP.
	 * @return HTTPRequest La requete HTTP.
	 */
	public function getHTTPRequest() {
		return $this->httpRequest;
	}

	/**
	 * Recuperer la reponse HTTP.
	 * @return HTTPResponse La reponse HTTP.
	 */
	public function getHTTPResponse() {
		return $this->httpResponse;
	}

	/**
	 * Recuperer l'utilisateur courant.
	 * @return User L'utilisateur courant.
	 */
	public function getUser() {
		return $this->user;
	}

	/**
	 * Recuperer la classe distribuant les gestionnaires.
	 * @return Managers
	 */
	public function managers() {
		return $this->managers;
	}

	/**
	 * Lance le webos.
	 */
	abstract public function run();
}