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
		$xml = new \DOMDocument;
		$xml->load('etc/servercalls.xml');
		$classes = $xml->getElementsByTagName('class');
		foreach ($classes as $class) {
			if ($class->getAttribute('name') == $className) {
				$methods = $class->getElementsByTagName('method');
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
				if (preg_match('#^~/#', $providedArgument) || $providedArgument == '~') {
					return 'file.user.'.$argumentAction;
				} elseif (preg_match('#^/home/#', $providedArgument))
					return 'file.home.'.$argumentAction;
				else {
					if ($argumentAction == 'read' && (preg_match('#^/usr/#', $providedArgument) || preg_match('#^/boot/#', $providedArgument)))
						return true;
					else
						return 'file.system.'.$argumentAction;
				}
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
				if ($this->webos->getUser()->isConnected() && $this->webos->getUser()->getId() == (int) $providedArgument) {
					return true;
				}
				return 'user.'.$argumentAction;
			default:
				return false;
		}
	}
}