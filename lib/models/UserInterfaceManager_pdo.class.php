<?php
namespace lib\models;

class UserInterfaceManager_pdo extends UserInterfaceManager {
	public function getDefault() {
		if ($this->webos->getUser()->isConnected()) { //L'utilisateur est connecte
			$interfaceType = 'ui'; //On cherche une interface de bureau (User Interface)
		} else {
			$interfaceType = 'lm'; //Sinon on cherche une interface de connexion (Login Manager)
		}

		//NOTE: il faut mettre "uis.default = 1" sinon erreur ("default" doit etre utilise par SQL)
		$sql = 'SELECT name FROM uis WHERE uis.default = 1 AND type = :type';
		$query = $this->dao->prepare($sql);
		$query->bindValue(':type', $interfaceType);
		$query->execute();

		while ($ui = $query->fetch(\PDO :: FETCH_ASSOC)) {
			return $ui['name'];
		}

		$query->closeCursor();

		//On n'a pas trouve d'interface appropriee, on lance une erreur
		throw new \RuntimeException('Aucune interface utilisateur n\'est d&eacute;finie');
	}

	public function getList() {
		$sql = 'SELECT name, type, default FROM uis';
		$query = $this->dao->prepare($sql);
		$query->execute();

		$list = array();

		while ($ui = $query->fetch(\PDO :: FETCH_ASSOC)) {
			$list[] = $ui;
		}

		$query->closeCursor();

		return $list;
	}

	public function setDefault($name, $value) {
		$value = ((int) $value) ? 1 : 0;

		$sql = 'UPDATE uis SET default = :default WHERE name = :name';
		$query = $this->dao->prepare($sql);
		$query->bindValue(':default', $value);
		$query->bindValue(':name', $name);
		$query->execute();

		$query->closeCursor();
	}
}