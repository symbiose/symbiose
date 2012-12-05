<?php
namespace lib\controllers;

/**
 * UserController controlle les utilisateurs.
 * @author $imon
 * @version 1.0
 */
class UserController extends \lib\ServerCallComponent {
	/**
	 * Connecter un utilisateur.
	 * @param string $username Le nom d'utilisateur.
	 * @param string $password Le mot de passe.
	 */
	protected function connect($username, $password) {
		$user = $this->webos->getUser();
		if ($user->isConnected()) {
			$user->forget();
		}
		$user->connect($username, $password);
		$user->remember();
		return $this->getAttributes();
	}

	/**
	 * Deconnecter un utilisateur.
	 */
	protected function disconnect() {
		$user = $this->webos->getUser();
		$user->forget();
	}

	/**
	 * Connecter un utilisateur en tant qu'invite.
	 */
	protected function connectAsGuest() {
		$user = $this->webos->getUser();
		$user->connectAsGuest();
		$user->remember();
	}

	/**
	 * Recuperer un attribut.
	 * @param string $attribute L'attribut a recuperer.
	 * @param int $userId L'ID de l'utilisateur. Si vide, correspond a l'utilisateur connecte.
	 */
	protected function getAttribute($attribute, $userId = null) {
		if ($userId === null) {
			if (!$this->webos->getUser()->isConnected())
				throw new \InvalidArgumentException('Utilisateur ind&eacute;fini');

			$userId = $this->webos->getUser()->getId();
		}

		$list = $this->webos->managers()->get('User')->getUsersList();

		if (!array_key_exists((int) $userId, $list))
			throw new \InvalidArgumentException('L\'utilisateur ayant l\'ID #'.$userId.' n\'existe pas');
		if (!array_key_exists($attribute, $list[(int) $userId]))
			throw new \InvalidArgumentException('Impossible de r&eacute;cup&eacute;rer l\'attribut "'.$attribute.'" de l\'utilisateur #'.$userId);

		$this->webos->getHTTPResponse()->setData(array($attribute => $list[(int) $userId][$attribute]));
	}

	/**
	 * Modifier un attribut.
	 * @param string $attribute L'attribut a modifier.
	 * @param string $value La nouvelle valeur de l'attribut.
	 * @param int $userId L'ID de l'utilisateur. Si vide, correspond a l'utilisateur connecte.
	 * @throws InvalidArgumentException
	 */
	protected function setAttribute($attribute, $value, $userId = null) {
		if ($attribute == 'disabled') {
			$authorisations = $this->webos->getAuthorization();
			$requiredAuthorisation = $authorisations->getArgumentAuthorizations($userId, 'user', 'manage');
			$authorisations->control($requiredAuthorisation);
		}

		if ($userId === null) {
			if (!$this->webos->getUser()->isConnected())
				throw new \InvalidArgumentException('Utilisateur ind&eacute;fini');

			$userId = $this->webos->getUser()->getId();
		}

		$this->webos->managers()->get('User')->setAttribute($userId, $attribute, $value);
	}

	/**
	 * Modifier plusieurs attributs.
	 * @param array $data Les attributs a modifier.
	 * @param int $userId L'ID de l'utilisateur. Si vide, correspond a l'utilisateur connecte.
	 * @throws InvalidArgumentException
	 */
	protected function setMultipleAttributes($data, $userId = null) {
		foreach ($data as $key => $value) {
			$this->setAttribute($key, $value, $userId);
		}
	}

	/**
	 * Modifier le mot de passe d'un utilisateur.
	 * @param string $currentPassword Le mot de passe actuel de l'utilisateur.
	 * @param string $newPassword Le nouveau mot de passe.
	 * @param int $userId L'ID de l'utilisateur. Si vide, correspond a l'utilisateur connecte.
	 */
	protected function setPassword($currentPassword, $newPassword, $userId = null) {
		if ($userId === null) {
			if (!$this->webos->getUser()->isConnected())
				throw new \InvalidArgumentException('Utilisateur ind&eacute;fini');

			$username = $this->webos->getUser()->getAttribute('realname');
		} else {
			$list = $this->webos->managers()->get('User')->getUsersList();
			if (!array_key_exists((int) $userId, $list))
				throw new \InvalidArgumentException('L\'utilisateur ayant l\'ID #'.$userId.' n\'existe pas');
			$username = $list[(int) $userId]['username'];
		}

		//On essaie de se connecter avec le mot de passe
		$user = new \lib\models\User($this->webos);
		$user->connect($username, $currentPassword); //Si l'authentification echoue, une exception sera lancee

		$this->webos->managers()->get('User')->setPassword($user, $newPassword);
	}

	/**
	 * Recuperer tous les attributs d'un utilisateur.
	 * @param int $userId L'ID de l'utilisateur. Si vide, correspond a l'utilisateur connecte.
	 */
	protected function getAttributes($userId = null) {
		if (empty($userId)) {
			if (!$this->webos->getUser()->isConnected())
				throw new \InvalidArgumentException('Utilisateur ind&eacute;fini');

			$userId = $this->webos->getUser()->getId();
		}

		$list = $this->webos->managers()->get('User')->getUsersList();

		if (!array_key_exists($userId, $list))
			throw new \InvalidArgumentException('L\'utilisateur ayant l\'ID #'.$userId.' n\'existe pas');

		$data = $list[$userId];
		$data['id'] = $userId;
		return $data;
	}

	/**
	 * Recuperer l'utilisateur connecte.
	 */
	protected function getLogged() {
		if (!$this->webos->getUser()->isConnected())
			return array();

		return $this->getAttributes();
	}

	/**
	 * Recuperer la liste des utilisateurs.
	 */
	protected function getList() {
		$list = $this->webos->managers()->get('User')->getUsersList();

		return $list;
	}

	/**
	 * Recuperer les autorisations d'un utilisateur.
	 * @param int $userId L'id de l'utilisateur.
	 */
	protected function getAuthorizations($userId = null) {
		if ($userId === null) {
			if (!$this->webos->getUser()->isConnected())
				throw new \InvalidArgumentException('Utilisateur ind&eacute;fini');

			$userId = $this->webos->getUser()->getId();
		}

		return $this->webos->managers()->get('User')->getAuthorisations($userId);
	}

	/**
	 * Definir les autorisations d'un utilisateur.
	 * @param string $auth Les nouvelles autorisations, separees par des point-virgules.
	 * @param int $userId L'id de l'utilisateur.
	 */
	protected function setAuthorizations($auth, $userId = null) {
		if ($userId === null) {
			if (!$this->webos->getUser()->isConnected())
				throw new \InvalidArgumentException('Utilisateur ind&eacute;fini');

			$userId = $this->webos->getUser()->getId();
		}

		$this->webos->managers()->get('User')->setAuthorisations($userId, $auth);
	}

	/**
	 * Definir si un utilisateur est active ou non.
	 * @param string $value Vrai pour activer l'utilisateur, faux sinon.
	 * @param int $userId L'id de l'utilisateur.
	 */
	public function setEnabled($value, $userId) {
		$this->webos->managers()->get('User')->setEnabled($userId, $value);
	}

	/**
	 * Supprimer un utilisateur.
	 * @param int $userId L'id de l'utilisateur a supprimer.
	 */
	protected function remove($userId) {
		$this->webos->managers()->get('User')->remove($userId);
	}

	/**
	 * Creer un nouvel utilisateur.
	 * @param string $data Les informations sur l'utilisateur, encodees en JSON.
	 * @param string $authorizations Les autorisations de l'utilisateur, separees par des point-virgules.
	 */
	protected function create($data, $authorizations) {
		$authorizations = explode(';', $authorizations);

		$this->webos->managers()->get('User')->create($data, $authorizations);
	}

	/**
	 * Determiner si l'inscription est activee.
	 */
	protected function canRegister() {
		$config = new \lib\models\Config($this->webos);
		$config->load('/etc/register.xml');
		$canRegister = (int) $config->get('register');

		return array('register' => ($canRegister) ? true : false);
	}

	/**
	 * Inscrire un nouvel utilisateur.
	 * @param string $data Les informations sur l'utilisateur, encodees en JSON.
	 */
	protected function register($data, $captchaData) {
		//Verification du captcha
		$captcha = $this->webos()->managers()->get('Captcha')->get($captchaData['id']);
		if (!$captcha->check($captchaData['value']))
			throw new \InvalidArgumentException('Le code de v&eacute;rification est incorrect');

		//Chargement de la configuration
		$config = new \lib\models\Config($this->webos);
		$config->load('/etc/register.xml');
		$canRegister = (int) $config->get('register');
		$authorizations = explode(';', $config->get('authorizations'));

		if (!$canRegister) {
			throw new \RuntimeException('L\'inscription a &eacute;t&eacute; d&eacute;sactiv&eacute;e. Pour obtenir un compte, veuillez contacter l\'administrateur syst&egrave;me');
		}

		//On inscrit le membre
		$this->webos->managers()->get('User')->create($data, $authorizations);
	}

	/**
	 * Recuperer des statistiques sur les utilisateurs.
	 */
	protected function getStats() {
		$stats = array();

		$list = $this->webos->managers()->get('User')->getUsersList();
		$stats['nbr_users'] = count($list);

		return $stats;
	}
}