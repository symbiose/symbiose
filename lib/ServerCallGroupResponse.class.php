<?php
namespace lib;

/**
 * ServerCallGroupResponse represente la reponse HTTP a une requete JavaScript.
 * @author $imon
 * @version 1.0
 */
class ServerCallGroupResponse extends HTTPResponse {
	/**
	 * Contenu de la reponse.
	 * @var string
	 */
	protected $responses;

	/**
	 * Envoyer la reponse HTTP.
	 */
	public function send() {
		//On definit le contenu de la reponse
		$this->contents = json_encode($this->responses, JSON_FORCE_OBJECT);

		$this->addHeader('Content-type: application/json; charset=utf-8'); //On va renvoyer du JSON
		parent::send(); //On envoie la reponse
	}

	/**
	 * Recuperer une nouvelle reponse a une requete.
	 * @param int $id L'id de la requete.
	 */
	public function getServerCallResponse($id) {
		return new ServerCallGroupResponseItem($id, $this);
	}

	/**
	 * Envoyer une nouvelle reponse a une requete.
	 * @param ServerCallGroupResponseItem $response
	 */
	public function sendServerCallResponse(ServerCallGroupResponseItem $response) {
		$this->responses[$response->getId()] = $response->getContents();
	}
}
