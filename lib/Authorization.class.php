<?php
namespace lib;

/**
 * Authorization represente l'autorisation d'effectuer une action.
 * @author $imon
 * @version 1.0
 */
class Authorization extends \lib\WebosComponent {
	/**
	 * Liste de toutes les autorisations de l'utilisateur.
	 * @var array
	 */
	protected $authorizations = array();

	/**
	 * Initialise l'autorisation.
	 * @param Webos Le webos.
	 * @param User $user L'utilisateur sous lequel on executera l'action.
	 * @param string $file Le fichier qui demande l'action.
	 */
	public function __construct(Webos $webos, models\User $user) {
		parent::__construct($webos);

		if ($user->getId() !== null)
			$this->authorizations = $this->webos->managers()->get('User')->getAuthorisations($user->getId());
	}

	/**
	 * Verifier que l'utilisateur a les droits suffisants pour executer une requete Javascript.
	 * @param ServerCallRequest $request La requete a executer.
	 */
	public function check(ServerCallRequest $request) {
		$actionAuthorizations = $this->_getActionAuthorization($request->getClass(), $request->getMethod(), $request->getArguments());
		foreach($actionAuthorizations as $actionAuthorization) {
			if (!$this->can($actionAuthorization))
				throw new \RuntimeException('Vous n\'avez pas les droits requis ("'.$actionAuthorization.'") pour effectuer cette action (classe : "'.$request->getClass().'"; m&eacute;thode : "'.$request->getMethod().'"; arguments: "'.implode('", "', $request->getArguments()).'")');
		}
		return true;
	}

	/**
	 * Determiner si l'utilisateur a les droits suffisants pour effectuer une action.
	 * @param string $authorization L'action a executer.
	 */
	public function can($authorization) {
		return (in_array($authorization, $this->authorizations) || $authorization === true);
	}

	/**
	 * Recuperer les autorisations.
	 * @return array
	 */
	public function get() {
		return $this->authorizations;
	}

	/**
	 * Controller que l'utilisateur a les droits suffisants pour effectuer une action.
	 * @param unknown_type $authorization
	 */
	public function control($authorization) {
		if (!$this->can($authorization))
			throw new \RuntimeException('Vous n\'avez pas les droits requis ("'.$authorization.'") pour effectuer cette action');
		return true;
	}

	/**
	 * Recuperer les autorisations requises pour effectuer une action.
	 * @param $className Le nom de la classe a appeler.
	 * @param $methodName Le nom de la methode a executer.
	 * @param $providedArguments les arguments fournis.
	 */
	protected function _getActionAuthorization($className, $methodName, array $providedArguments) {
		$path = '/etc/servercalls/'.$className.'.xml';
		$manager = $this->webos->managers()->get('File');

		if (!$manager->exists($path)) {
			throw new \RuntimeException('Impossible de r&eacute;cup&eacute;rer les autorisations de la classe "'.$className.'"');
		}

		$file = $manager->get($path);

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$methods = $xml->getElementsByTagName('method');
		foreach($methods as $method) {
			if ($method->getAttribute('name') == $methodName) {
				$requiredAuthorizations = array();

				$methodAuthorizations = $method->getElementsByTagName('authorization');
				foreach($methodAuthorizations as $methodAuthorization) {
					$requiredAuthorizations[] = $methodAuthorization->getAttribute('action');
				}

				$arguments = $method->getElementsByTagName('argument');
				foreach($arguments as $argument) {
					$providedArgument = null;
					if (array_key_exists((int) $argument->getAttribute('id'), $providedArguments)) {
						$providedArgument = $providedArguments[(int) $argument->getAttribute('id')];
					}

					$requiredAuthorizations[] = $this->getArgumentAuthorizations($providedArgument, $argument->getAttribute('type'), $argument->getAttribute('action'));
				}
				
				return $requiredAuthorizations;
			}
		}

		throw new \RuntimeException('Impossible de r&eacute;cup&eacute;rer les autorisations de la m&eacute;thode "'.$methodName.'" de la classe "'.$className.'"');
	}

	/**
	 * Recuperer les autorisations requises pour appeler une methode.
	 * @param string $providedArgument L'argument fourni.
	 * @param string $argumentType Le type d'argument.
	 * @param string $argumentAction L'action que la methode effectuera sur l'argument (ex: pour un fichier, le lire ou le modifier)
	 */
	public function getArgumentAuthorizations($providedArgument, $argumentType, $argumentAction) {
		switch($argumentType) {
			case 'file':
				if ($providedArgument === null) {
					return true;
				}

				$path = $providedArgument;

				//Quelques nettoyages...
				$dirs = explode('/', $path);
				$path = array();
				foreach ($dirs as $dir) {
					if ($dir == '..') {
						array_pop($path);
					} elseif ($dir == '.') {
						continue;
					} elseif ($dir == '~') {
						if ($this->webos->getUser()->isConnected()) {
							$path += explode('/', $this->webos->managers()->get('File')->userDirectory());
						} else {
							$path[] = $dir;
						}
					} elseif (empty($dir)) {
						continue;
					} else {
						$path[] = $dir;
					}
				}
				$path = implode('/', $path);

				//On ajoute le / devant
				if (!preg_match('#^/#',$path))
					$path = '/'.$path;
				
				//Dernier nettoyage
				$path = preg_replace('#/\.$#','/',$path);

				if ($this->webos->getUser()->isConnected()) {
					if (preg_match('#^'.$this->webos->managers()->get('File')->userDirectory().'/#', $path) || $path == $this->webos->managers()->get('File')->userDirectory()) {
						return 'file.user.'.$argumentAction;
					}
				}

				if (preg_match('#^/home/#', $path))
					return 'file.home.'.$path;

				if ($argumentAction == 'read' && (preg_match('#^/usr/#', $path) || preg_match('#^/boot/#', $path)))
					return true;

				return 'file.system.'.$argumentAction;
				break;
			case 'package':
				if (!$this->webos->managers()->get('Package')->isPackage($providedArgument))
					return 'package.unchecked.'.$argumentAction;

				$package = $this->webos->managers()->get('Package')->getPackage($providedArgument);
				if ($package->isChecked())
					return 'package.checked.'.$argumentAction;
				else
					return 'package.unchecked.'.$argumentAction;
				break;
			case 'user':
				if (($argumentAction == 'read' || $argumentAction == 'edit') && $this->webos->getUser()->isConnected() && $this->webos->getUser()->getId() == (int) $providedArgument) {
					return true;
				}
				return 'user.'.$argumentAction;
			default:
				return false;
		}
	}
}