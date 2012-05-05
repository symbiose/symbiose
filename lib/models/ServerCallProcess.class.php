<?php
namespace lib\models;

class ServerCallProcess extends Process {
	protected $className;
	protected $methodName;

	public function __construct(\lib\Webos $webos, \lib\Authorization $auth, $class, $method) {
		//On appelle le constructeur du parent.
		parent::__construct($webos, $auth);

		$this->className = $class;
		$this->methodName = $method;
	}

	public function run() {
		$class = '\lib\controllers\\' . $this->className;
		$method = $this->methodName;

		//On cree une instance de la classe demandee
		$instance = new $class($this->webos);

		//On execute l'action demandee
		$instance($method, $this->webos->getHTTPRequest()->getArguments());

		$this->stop();
	}
}