<?php
namespace lib\models;

class UserManager_files extends UserManager {
	public function getUsersList() {
		$file = $this->dao->get('/etc/users.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$users = $xml->getElementsByTagName('user');
		$list = array();
		foreach ($users as $user) {
			$userAttributes = $user->getElementsByTagName('attribute');
			$userData = array();
			foreach($userAttributes as $userAttribute) {
				$userData[$userAttribute->getAttribute('name')] = $userAttribute->getAttribute('value');
			}
			$list[$user->getAttribute('id')] = $userData;
		}
		return $list;
	}

	public function getPassword(User $user) {
		$userId = $user->getId();

		$file = $this->dao->get('/etc/passwords.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$users = $xml->getElementsByTagName('user');
		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$userAttributes = $user->getElementsByTagName('attribute');
				foreach($userAttributes as $userAttribute) {
					if ($userAttribute->getAttribute('name') == 'password')
						return $userAttribute->getAttribute('value');
				}
			}
		}
		return false;
	}

	public function getAuthorisations($userId) {
		$file = $this->dao->get('/etc/authorizations.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$users = $xml->getElementsByTagName('user');
		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$authorizations = array();
				foreach ($user->getElementsByTagName('authorization') as $authorization) {
					$authorizations[] = $authorization->getAttribute('name');
				}
				return $authorizations;
			}
		}
	}

	public function setAuthorisations($userId, array $authorizations) {
		$file = $this->dao->get('/etc/authorizations.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$users = $xml->getElementsByTagName('user');
		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$authorizationsToRemove = array();
				foreach ($user->getElementsByTagName('authorization') as $authorization) {
					if (!in_array($authorization->getAttribute('name'), $authorizations)) {
						$authorizationsToRemove[] = $authorization;
					} else {
						unset($authorizations[array_search($authorization->getAttribute('name'), $authorizations)]);
					}
				}
				foreach($authorizationsToRemove as $authorization){
					$authorization->parentNode->removeChild($authorization);
				}
				foreach ($authorizations as $auth) {
					$authNode = $xml->createElement('authorization');

					$name = $xml->createAttribute('name');
					$name->appendChild($xml->createTextNode($auth));

					$authNode->appendChild($name);

					$user->appendChild($authNode);
				}
				break;
			}
		}

		$file->setContents($xml->saveXML());
	}

	public function setAttribute($userId, $attribute, $value) {
		$file = $this->dao->get('/etc/users.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$users = $xml->getElementsByTagName('user');
		$list = array();
		foreach ($users as $user) { //On parcoure la liste des utilisateurs
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$userAttributes = $user->getElementsByTagName('attribute');
				foreach($userAttributes as $userAttribute) {
					if ($userAttribute->getAttribute('name') == $attribute) {
						$userAttribute->setAttribute('value', $value);
						break 2;
					}
				}

				$node = $xml->createElement('attribute');
				$user->appendChild($node);

				$name = $xml->createAttribute('name');
				$name->appendChild($xml->createTextNode($attribute));
				$node->appendChild($name);

				$val = $xml->createAttribute('value');
				$val->appendChild($xml->createTextNode($value));
				$node->appendChild($val);

				break;
			}
		}

		$file->setContents($xml->saveXML());
	}

	public function setPassword(User $user, $password) {
		$userId = $user->getId();

		$file = $this->dao->get('/etc/passwords.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$users = $xml->getElementsByTagName('user');
		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$userAttributes = $user->getElementsByTagName('attribute');
				foreach($userAttributes as $userAttribute) {
					if ($userAttribute->getAttribute('name') == 'password') {
						$userAttribute->setAttribute('value', $this->encodePassword($password));

						$file->setContents($xml->saveXML());
						return;
					}
				}
			}
		}

		return false;
	}

	public function create(array $data, array $authorizations) {
		$userData = array(
			'username' => $data['username'],
			'realname' => $data['realname'],
			'email' => $data['email']
		);

		$password = $data['password'];

		foreach($userData as $index => $value) {
			if (($err = $this->checkData($index, $value)) !== true) {
				throw new \InvalidArgumentException($err);
			}
		}

		if (($err = $this->checkPassword($password)) !== true) {
			throw new \InvalidArgumentException($err);
		}

		$encodedPassword = $this->encodePassword($password);

		//Ajout de l'utilisateur

		$file = $this->dao->get('/etc/users.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$users = $xml->getElementsByTagName('user');

		$lastId = 0;
		$nbrUsers = 0;

		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') > $lastId) {
				$lastId = (int) $user->getAttribute('id');
			}
			$nbrUsers++;
		}

		//Verification du quota d'utilisateurs
		$config = new Config($this->webos);
		$config->load('/etc/quotas.xml');
		$maxUsers = (int) $config->get('accounts');

		if ($maxUsers != -1 && $nbrUsers + 1 > $maxUsers) {
			$s = ($nbrUsers > 1) ? 's' : '';
			throw new \RuntimeException('Le nombre maximal de comptes est atteint ('.$nbrUsers.' compte'.$s.' cr&eacute;&eacute;'.$s.')');
		}

		$userId = $lastId + 1;

		$root = $xml->getElementsByTagName('users')->item(0);

		$element = $xml->createElement('user');
		$root->appendChild($element);

		$name = $xml->createAttribute('id');
		$name->appendChild($xml->createTextNode($userId));
		$element->appendChild($name);

		foreach ($userData as $index => $value) {
			$node = $xml->createElement('attribute');
			$element->appendChild($node);

			$attr = $xml->createAttribute('name');
			$attr->appendChild($xml->createTextNode($index));
			$node->appendChild($attr);

			$attr = $xml->createAttribute('value');
			$attr->appendChild($xml->createTextNode($value));
			$node->appendChild($attr);
		}

		$file->setContents($xml->saveXML());


		//Ajout du mot de passe

		$file = $this->dao->get('/etc/passwords.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$root = $xml->getElementsByTagName('users')->item(0);

		$element = $xml->createElement('user');
		$root->appendChild($element);

		$name = $xml->createAttribute('id');
		$name->appendChild($xml->createTextNode($userId));
		$element->appendChild($name);

		$node = $xml->createElement('attribute');
		$element->appendChild($node);

		$attr = $xml->createAttribute('name');
		$attr->appendChild($xml->createTextNode('password'));
		$node->appendChild($attr);

		$attr = $xml->createAttribute('value');
		$attr->appendChild($xml->createTextNode($encodedPassword));
		$node->appendChild($attr);

		$file->setContents($xml->saveXML());


		//Ajout des autorisations

		$file = $this->dao->get('/etc/authorizations.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$root = $xml->getElementsByTagName('users')->item(0);

		$element = $xml->createElement('user');
		$root->appendChild($element);

		$name = $xml->createAttribute('id');
		$name->appendChild($xml->createTextNode($userId));
		$element->appendChild($name);

		foreach ($authorizations as $authorization) {
			$node = $xml->createElement('authorization');
			$element->appendChild($node);

			$attr = $xml->createAttribute('name');
			$attr->appendChild($xml->createTextNode($authorization));
			$node->appendChild($attr);
		}

		$file->setContents($xml->saveXML());

		//Creation du repertoire personnel
		$defaultDir = $this->dao->get('/etc/ske1/');
		$defaultDir->copy('/home/'.$userData['username'].'/');
	}

	public function remove($userId) {
		//Suppression de l'utilisateur

		$file = $this->dao->get('/etc/users.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$users = $xml->getElementsByTagName('user');

		$username = false;

		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$userAttributes = $user->getElementsByTagName('attribute');
				foreach($userAttributes as $userAttribute) {
					if ($userAttribute->getAttribute('name') == 'username') {
						$username = $userAttribute->getAttribute('value');
					}
				}
				$user->parentNode->removeChild($user);
			}
		}

		$file->setContents($xml->saveXML());


		//Suppression du mot de passe

		$file = $this->dao->get('/etc/passwords.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$users = $xml->getElementsByTagName('user');

		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$user->parentNode->removeChild($user);
			}
		}

		$file->setContents($xml->saveXML());

		//Suppression des autorisations

		$file = $this->dao->get('/etc/authorizations.xml');
		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$users = $xml->getElementsByTagName('user');

		foreach ($users as $user) {
			if ((int) $user->getAttribute('id') == (int) $userId) {
				$user->parentNode->removeChild($user);
			}
		}

		$file->setContents($xml->saveXML());

		//Suppression du repertoire personnel
		if ($username !== false) {
			$home = $this->dao->get('/home/'.$username.'/');
			$home->delete();
		}
	}
}
