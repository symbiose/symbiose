<?php
namespace lib;

/**
 * ServerCallComponent represente une classe qui peut etre appelee depuis un script JavaScript.
 * @author $imon
 * @version 1.0
 */
abstract class ServerCallComponent extends \lib\WebosComponent {
	/**
	 * Execute la methode demandee avec les arguments fournis.
	 * @param string $methodName Le nomd e la methode.
	 * @param array $arguments Un tableau contenant les arguments a fournir a la methode.
	 * @return Le resultat de l'operation.
	 */
	public function __invoke($methodName, array $arguments = array()) {
		$classData = new \ReflectionClass($this); //Infos sur la classe

		//Si la methode demandee existe
		if (!$classData->hasMethod($methodName))
			throw new InvalidArgumentException('La m&eacute;thode "'.$methodName.'" de la classe "'.$classData->getName().'" n\'existe pas');

		//On recupere les infos sur la methode demandee
		$method = $classData->getMethod($methodName);

		//On n'execute que les methodes protegees
		if (!$method->isProtected())
			throw new RuntimeException('La m&eacute;thode "'.$methodName.'" de la classe "'.$classData->getName().'" est mal construite : elle doit &ecirc;tre prot&eacute;g&eacute;');

		//On execute la methode
		$returned = call_user_func_array(array($this, $methodName), $arguments);

		if ($this->webos->getHTTPResponse()->isChannelEmpty()) { //Si la fonction n'a rien ajoute a la sortie
			//On essaie d'ajouter les donnees recuperees
			if (!empty($returned))
				$this->webos->getHTTPResponse()->setResponse($returned);
		}
	}
}