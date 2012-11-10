<?php
namespace lib;

/**
 * ServerCallResponse represente la reponse HTTP a une requete JavaScript.
 * @author $imon
 * @version 1.0
 */
class ServerCallResponse extends HTTPResponse {
	/**
	 * Contenu de la reponse.
	 * @var string
	 */
	protected $out;
	/**
	 * Les differents cannaux.
	 * @var array
	 */
	protected $channels = array(1 => null, 2 => null);
	/**
	 * Vrai si la requete a reussi (aucune erreur ne s'est produite).
	 * @var bool
	 */
	protected $success = true;
	/**
	 * Donnees a transmettre dans la reponse.
	 * @var array
	 */
	protected $data = array();
	/**
	 * Code JavaScript a executer.
	 * @var string
	 */
	protected $js;

	/**
	 * Initialiser la reponse.
	 */
	public function __construct() {
		//On demarre la temporisation de sortie
		//Permet de recuperer les donnees renvoyees par le script PHP
		//ob_implicit_flush();
		ob_start(array($this, 'addToStandardChannel'));
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
		$this->contents = json_encode(array(
			'success' => $this->success,
			'channels' => $this->channels,
			'out' => $this->out,
			'data' => $this->data,
			'js' => $this->js
		), JSON_FORCE_OBJECT);

		$this->addHeader('Content-type: application/json; charset=utf-8'); //On va renvoyer du JSON
		parent::send(); //On envoie la reponse
	}

	/**
	 * Ajouter du texte a la reponse.
	 * @param string $contents Le contenu a ajouter
	 * @param int $channel Le cannal ou ajouter le texte
	 */
	public function addContent($contents, $channel = 1) {
		if (!($channel >= 1 && $channel <= 9))
			throw new InvalidArgumentException('Le num&eacute;ro du cannal de sortie doit &ecirc;tre compris entre 1 et 9 (fourni : '.$channel.')');

		$this->out .= $contents;
		$this->channels[$channel] .= $contents;
	}

	public function isError() {
		$this->success = 0;
	}

	/**
	 * Ajouter une erreur.
	 * @param $error Le message d'erreur
	 */
	public function addError($error) {
		$this->success = 0;
		$this->addContent("\n".$error, 2);
	}

	/**
	 * Ajouter une erreur a partir d'une exception.
	 * @param Exception $exception L'exception.
	 */
	public function catchException(Exception $exception) {
		$this->addError($exception->getMessage());
	}

	/**
	 * Determiner si un cannal est vide.
	 * @param int $channel Le numero du cannal.
	 * @return bool Vrai si le cannal est vide.
	 */
	public function isChannelEmpty($channel = 1) {
		if (!array_key_exists($channel, $this->channels))
			return false;

		return empty($this->channels[$channel]);
	}

	/**
	 * Ajouter du texte au cannal par defaut.
	 * @param string $text Le texte a ajouter.
	 */
	public function addToStandardChannel($text) {
		$this->addContent($text, 1);
		return ''; //On renvoie une chaine vide pour ne rien afficher
	}

	/**
	 * Definir les donnees a transmettre au script JavaScript.
	 * @param array $data Les donnees.
	 */
	public function setData(array $data) {
		$this->data = $data;
	}

	/**
	 * Definir un script JavaScript a executer.
	 * @param string $js Le script JavaScript.
	 */
	public function setJavascript($js) {
		$this->js = $js;
	}

	/**
	 * Ajouter un script Javascript a executer.
	 * @param string $js Le script JavaScript.
	 */
	public function addJavascript($js) {
		$this->js .= $js;
	}

	/**
	 * Definir une donnee comme reponse.
	 * @param mixed $data La donnee.
	 */
	public function setResponse($data) {
		switch (gettype($data)) {
			case 'array':
				$this->setData($data);
				break;
			default:
				$this->addToStandardChannel((string) $data);
		}
	}
}
