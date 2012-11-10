<?php
namespace lib;

/**
 * ServerCallGroupResponseItem represente un reponse HTTP a un groupe de requetes JavaScript.
 * @author $imon
 * @version 1.0
 */
class ServerCallGroupResponseItem extends ServerCallResponse {
	/**
	 * L'id de la requete.
	 * @var int
	 */
	protected $id;

	/**
	 * La requete parente.
	 * @var ServerCallGroupResponse
	 */
	protected $parent;

	/**
	 * Initialiser la reponse.
	 */
	public function __construct($id, ServerCallGroupResponse $parent) {
		parent::__construct();

		$this->id = (int) $id;
		$this->parent = $parent;
	}

	/**
	 * Envoyer la reponse HTTP.
	 */
	public function send() {
		//On arrete la temporisation de sortie
		if (ob_get_level() > 0) {
			ob_end_flush();
		}

		//On definit le contenu de la reponse
		$this->contents = array(
			'success' => $this->success,
			'channels' => $this->channels,
			'out' => $this->out,
			'data' => $this->data,
			'js' => $this->js
		);

		$this->parent->sendServerCallResponse($this);
	}

	/**
	 * Recuperer l'id de la requete associee a cette reponse.
	 * @return int
	 */
	public function getId() {
		return $this->id;
	}
}
