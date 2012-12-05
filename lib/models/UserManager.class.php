<?php
namespace lib\models;

/**
 * UserManager permet de gerer les utilisateurs.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 26 nov. 2011
 */
abstract class UserManager extends \lib\Manager {
	/**
	 * Recuperer l'utilisateur en session.
	 * @return bool|string False si l'utilisateur n'est pas en session, l'objet User de l'utilisateur sinon.
	 */
	public function getRemembered() {
		if (self::isRemembered()){
			$user = unserialize($_SESSION['user']);
			$user->setWebos($this->webos);
			return $user;
		} else
			return false;
	}

	/**
	 * Determiner si un utilisateur est en session.
	 * @return bool Vrai si l'utilisateur est en session.
	 */
	public function isRemembered() {
		return array_key_exists('user', $_SESSION);
	}

	/**
	 * Recuperer la liste des utilisateurs et leurs attributs.
	 * @return array Un tableau contenant les informations sur les utilisateurs.
	 */
	abstract public function getUsersList();

	/**
	 * Modifier un attribut d'un utilisateur.
	 * @param int $userId L'id de l'utilisateur.
	 * @param string $attribute L'attribut a modifier.
	 * @param string $value La nouvelle valeur de l'attribut.
	 */
	abstract public function setAttribute($userId, $attribute, $value);

	/**
	 * Modifier le mot de passe d'un utilisateur.
	 * @param User $user L'id de l'utilisateur.
	 * @param string $attribute Le nouveau mot de passe.
	 */
	abstract public function setPassword(User $user, $password);

	/**
	 * Recuperer le mot de passe (hashe) de l'utilisateur.
	 * @param User $user L'utilisateur.
	 * @return string Le mot de passe hashe.
	 */
	abstract public function getPassword(User $user);

	/**
	 * Recuperer les autorisations de l'utilisateur.
	 * @param int $userId L'id de l'utilisateur.
	 * @return array Les autorisations.
	 */
	abstract public function getAuthorisations($userId);

	/**
	 * Definir les autorisations de l'utilisateur.
	 * @param int $userId L'id de l'utilisateur.
	 * @param array $auth Les autorisations.
	 */
	abstract public function setAuthorisations($userId, array $auth);

	/**
	 * Creer un utilisateur.
	 * @param array $data Les informations sur l'utilisateur.
	 * @param array $authorizations Les autorisations de l'utilisateur.
	 */
	abstract public function create(array $data, array $authorizations);

	/**
	 * Supprimer un utilisateur.
	 * @param int $userId L'id de l'utilisateur a supprimer.
	 */
	abstract public function remove($userId);

	/**
	 * Recuperer les attributs de l'utilisateur invite.
	 * @return array Un tableau contenant les informations sur l'utilisateur invite.
	 */
	public function getGuestAttributes() {
		$file = $this->webos->managers()->get('File')->get('/etc/guest.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$userAttributes = $xml->getElementsByTagName('attribute');
		$userData = array();
		foreach($userAttributes as $userAttribute) {
			$userData[$userAttribute->getAttribute('name')] = $userAttribute->getAttribute('value');
		}

		return $userData;
	}

	/**
	 * Verifier la validite d'une information sur un utilisateur.
	 * @param string $index Le nom de l'information.
	 * @param string $value La valeur de l'information.
	 * @return bool|string Vrai si l'information est valide, un message contenant l'erreur sinon.
	 */
	protected function checkData($index, $value) {
		switch ($index) {
			case 'username':
				if (empty($value)) {
					return 'Le nom d\'utilisateur est vide';
				}
				if (!preg_match('#^[a-z0-9-_\.]+$#i', $value)) {
					return 'Le nom d\'utilisateur contient des caract&egrave;res non alphanum&eacute;riques et autres que "-", "_" et "."';
				}

				//Verification de la presence d'un doublon
				$list = $this->getUsersList();

				foreach ($list as $id => $data) {
					if ($data['username'] == $value) {
						return 'Le nom d\'utilisateur est d&eacute;j&agrave; pris';
					}
				}
				break;
			case 'realname':
				if (empty($value)) {
					return 'Le nom r&eacute;el est vide';
				}
				break;
			case 'email':
				if (empty($value)) {
					return 'L\'e-mail est vide';
				}
				if (!preg_match('#^[a-z0-9._-]+@[a-z0-9._-]{2,}\.[a-z]{2,4}$#', $value)) {
					return 'L\'e-mail est incorrect';
				}

				//Verification de la presence d'un doublon
				$list = $this->getUsersList();

				foreach ($list as $id => $data) {
					if ($data['email'] == $value) {
						return 'Un compte est d&eacute;j&agrave; existant avec cette adresse e-mail';
					}
				}
				break;
			default:
				return 'Information "'.$index.'" invalide';
		}

		return true;
	}

	/**
	 * Hasher un mot de passe.
	 * @param string $password Le mot de passe a hasher.
	 * @return string Le mot de passe hashe.
	 */
	public function encodePassword($password) {
		return sha1($password);
	}

	/**
	 * Verifier la validite d'un mot de passe.
	 * @param string $password Le mot de passe.
	 * @return bool|string Vrai si le mot de passe est valide, un message contenant l'erreur sinon.
	 */
	protected function checkPassword($password) {
		if (empty($password)) {
			return 'Le mot de passe est vide';
		}

		if (strlen($password) < 4) {
			return 'Le mot de passe fait moins de 4 caract&egrave;res';
		}

		return true;
	}
}