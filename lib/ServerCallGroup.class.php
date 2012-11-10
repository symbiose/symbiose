<?php
namespace lib;

use \Exception;

/**
 * ServerCallGroup est la classe representant un groupe de requetes JavaScript vers le serveur.
 * @author $imon
 * @version 1.0
 */
class ServerCallGroup extends Webos {
	/**
	 * Les processus associes aux actions.
	 * @var array
	 */
	protected $serverCalls = array();

	/**
	 * Initialise la requete.
	 */
	public function __construct(ServerCallGroupRequest $httpRequest, ServerCallGroupResponse $httpResponse) {
		parent::__construct(); //On appelle le constructeur parent

		//On initialise la requete et la reponse HTTP
		$this->httpRequest = $httpRequest;
		$this->httpResponse = $httpResponse;

		foreach ($this->httpRequest->getRequests() as $index => $request) {
			try {
				$this->serverCalls[$index] = new ServerCall($request, $this->httpResponse->getServerCallResponse($index));
			} catch (Exception $e) { //En cas d'erreur
				Error::catchException($e);
			}
		}
	}

	/**
	 * Execute la requete.
	 */
	public function run() {
		foreach ($this->serverCalls as $serverCall) {
			try { //On essaie d'executer l'action demandee
				$serverCall->run();
			} catch (Exception $e) { //En cas d'erreur
				Error::catchException($e);
			}
		}

		//On envoie la reponse HTTP
		$this->getHTTPResponse()->send();
	}
}
