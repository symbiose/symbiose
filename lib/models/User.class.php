<?php
namespace lib\models;

/**
 * User represente l'utilisateur du Webos.
 * @author $imon
 * @version 1.1
 * @since 1.0
 */
class User extends \lib\WebosComponent {
	/**
	 * @var int L'ID de l'utilisateur.
	 */
	protected $id;

	/**
	 * @var array Les attributs de l'utilisateur.
	 */
	protected $attributes = array();

	/**
	 * @var bool Vrai si l'utilisateur est connecte.
	 */
	protected $connected = false;

	/**
	 * @var bool Vrai si l'utilisateur est un invite.
	 */
	protected $guest = false;

	/**
	 * Connecter un utilisateur.
	 * @param string $username Le nom d'utilisateur.
	 * @param string $password Le mot de passe.
	 */
	public function connect($username, $password) {
		//On recupere la liste des utilisateurs
		$users = $this->webos->managers()->get('User')->getUsersList();
		foreach ($users as $id => $userData) {
			//Si le nom d'utilisateur correspond
			if ($userData['username'] == $username) {
				$this->id = $id;

				//On verifie que l'utilisateur est bien active
				if (isset($userData['disabled']) && (int) $userData['disabled'] == 1) {
					throw new \Exception('L\'utilisateur "'.$userData['username'].'" est d&eacute;sactiv&eacute;');
				}

				//On teste le mot de passe
				if ($this->webos->managers()->get('User')->encodePassword($password) != $this->webos->managers()->get('User')->getPassword($this)) {
					//On stoppe le script pendant 4 secondes pour eviter l'attque par force brute
					sleep(4);
					throw new \InvalidArgumentException('Le nom d\'utilisateur ou le mot de passe est incorrect');
				}

				$filesManager = $this->webos->managers()->get('File');
				if (!$filesManager->exists('/home/'.$username.'/')) {
					//Creation du repertoire personnel
					$defaultDir = $filesManager->get('/etc/ske1/');
					$defaultDir->copy('/home/'.$username.'/');
				}

				$this->attributes = $userData;

				$this->connected = true;

				return;
			}
		}

		//On stoppe le script pendant 4 secondes pour eviter l'attque par force brute
		sleep(4);
		throw new \InvalidArgumentException('Le nom d\'utilisateur ou le mot de passe est incorrect');
	}

	/**
	 * Connecter un utilisateur en tant qu'invite.
	 */
	public function connectAsGuest() {
		$this->attributes = $this->webos->managers()->get('User')->getGuestAttributes();
		$this->guest = true;
	}

	/**
	 * Se souvenir de l'utilisateur.
	 */
	public function remember() {
		$_SESSION['user'] = serialize($this);
	}

	/**
	 * Ne plus se rappeler de l'utilisateur.
	 */
	public function forget() {
		if ($this->webos->managers()->get('User')->isRemembered())
			unset($_SESSION['user']);
	}

	/**
	 * Recuperer l'ID de l'utilisateur.
	 * @return int L'ID de l'utilisateur.
	 */
	public function getId() {
		return $this->id;
	}

	/**
	 * Determiner si l'utilisateur est connecte ou non.
	 * @return bool Vrai si l'utilisateur est connecte.
	 */
	public function isConnected() {
		return $this->connected;
	}

	/**
	 * Determiner si l'utilisateur est connecte en tant qu'invite.
	 * @return bool Vrai si l'utilisateur est un invite.
	 */
	public function isGuest() {
		return $this->guest;
	}

	/**
	 * Recuperer un attribut.
	 * @param string $attribute L'attribut.
	 * @return string La valeur de l'attribut.
	 */
	public function getAttribute($attribute) {
		if (!array_key_exists($attribute, $this->attributes))
			return false;

		return $this->attributes[$attribute];
	}
}
