<?php
namespace lib;

use \Exception;

/**
 * ServerCall est la classe representant une requete JavaScript vers le serveur.
 * @author $imon
 * @version 1.0
 */
class ServerCall extends Webos {
	/**
	 * Le processus associe a l'action
	 * @var Process
	 */
	protected $process;

	/**
	 * Initialise la requete.
	 */
	public function __construct(ServerCallRequest $httpRequest, ServerCallResponse $httpResponse) {
		parent::__construct(); //On appelle le constructeur parent

		//On initialise la requete et la reponse HTTP
		$this->httpRequest = $httpRequest;
		$this->httpResponse = $httpResponse;

		//Classe demandee dans la requete
		$class = $this->getHTTPRequest()->getClass();

		if(!class_exists('\lib\controllers\\'.$class)) //On verifie que la classe existe
			throw new \InvalidArgumentException('La classe "'.$class.'" sp&eacute;cifi&eacute;e dans la requ&ecirc;te HTTP n\'existe pas');
		//Et qu'elle herite bien de ServerCallComponent
		if (!in_array('lib\ServerCallComponent', class_parents('\lib\controllers\\'.$class)))
			throw new \InvalidArgumentException('La classe "'.$class.'" sp&eacute;cifi&eacute;e dans la requ&ecirc;te HTTP ne peut pas &ecirc;tre appell&eacute;e comme action d\'administration');

		//Si un mot de passe et un nom d'utilisateur sont specifies dans la requete
		//On tente d'executer l'action demandee avec l'utilisateur specifie
		if ($this->getHTTPRequest()->getPassword() != null && $this->getHTTPRequest()->getUsername() != null) {
			$this->user = new User($this->getHTTPRequest()->getUsername(), $this->getHTTPRequest()->getPassword());
		}

		if ($this->getHTTPRequest()->getPid() != null && $this->getHTTPRequest()->getKey() != null) {
			$process = Process::get($this->getHTTPRequest()->getPid());

			if ($process->getKey() == $this->getHTTPRequest()->getKey()) {
				throw new RuntimeException('Clef du processus #'.$this->getHTTPRequest()->getPid().' invalide');
			}

			if (!$process->getAuthorization()->check($this->getHTTPRequest()))
				throw new RuntimeException('Vous n\'avez pas les droits requis pour effectuer cette action (module : "'.$class.'"; action : "'.$this->getHTTPRequest()->getMethod().'"; arguments: "'.implode('", "', $this->getHTTPRequest()->getArguments()).'")');

			$this->process = $process;
		} else {
			//On cree l'autorisation d'executer l'action
			$authorization = new Authorization($this, $this->user);

			//Si on n'a pas les droits suffisants pour executer la requete demandee
			if (!$authorization->check($this->getHTTPRequest()))
				throw new RuntimeException('Vous n\'avez pas les droits requis pour effectuer cette action (module : "'.$class.'"; action : "'.$this->getHTTPRequest()->getMethod().'"; arguments: "'.implode('", "', $this->getHTTPRequest()->getArguments()).'")');

			//On cree le processus de l'action
			$this->process = new models\ServerCallProcess($this, $authorization, $this->getHTTPRequest()->getClass(), $this->getHTTPRequest()->getMethod());
		}
	}

	/**
	 * Recuperer l'autorisation du processus de la requete.
	 * @return Authorization
	 */
	public function getAuthorization() {
		return $this->process->getAuthorization();
	}

	/**
	 * Recuperer le processus de la requete.
	 * @return Process
	 */
	public function getProcess() {
		return $this->process;
	}

	/**
	 * Execute la requete.
	 */
	public function run() {
		// On envoie une deuxieme fois l'instance au gestionnaire d'erreurs
		// (1e fois = Webos->__construct())
		// Important pour ServerCallGroup !
		Error::setErrorsWebos($this);

		try { //On essaie d'executer l'action demandee
			$this->process->run();
		} catch (Exception $e) { //En cas d'erreur
			Error::catchException($e);
		}

		//On envoie la reponse HTTP
		$this->getHTTPResponse()->send();
	}
}
