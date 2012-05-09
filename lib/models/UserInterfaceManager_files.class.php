<?php
namespace lib\models;

class UserInterfaceManager_files extends UserInterfaceManager {
	public function getDefault() {
		if ($this->webos->getUser()->isConnected() || $this->webos->getUser()->isGuest()) { //L'utilisateur est connecte
			$interfaceType = 'ui'; //On cherche une interface de bureau (User Interface)
		} else {
			$interfaceType = 'lm'; //Sinon on cherche une interface de connexion (Login Manager)
		}

		$file = $this->dao->get('/etc/uis.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$uis = $xml->getElementsByTagName('ui');
		foreach ($uis as $ui) { //Pour chaque interface
			//Si elle porte l'attribut "defaut"
			if ($ui->hasAttribute('default') && (int) $ui->getAttribute('default') == 1) {
				//Si elle est du type demande
				if ($ui->getAttribute('type') == $interfaceType)
					return $ui->getAttribute('name');
			}
		}

		//On n'a pas trouve d'interface appropriee, on lance une erreur
		throw new RuntimeException('Aucune interface utilisateur n\'est d&eacute;finie');
	}

	public function getList() {
		$file = $this->dao->get('/etc/uis.xml');
		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$uis = $xml->getElementsByTagName('ui');
		$list = array();
		foreach ($uis as $ui) { //Pour chaque interface
			$list[] = array(
				'name' => $ui->getAttribute('name'),
				'type' => $ui->getAttribute('type'),
				'default' => ($ui->hasAttribute('default') && (int) $ui->getAttribute('default') == 1)
			);
		}
		return $list;
	}

	public function setDefault($name, $value) {
		$value = ((int) $value) ? 1 : 0;

		$file = $this->dao->get('/etc/uis.xml');
		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$uis = $xml->getElementsByTagName('ui');

		foreach ($uis as $ui) {
			$list[] = array(
				'name' => $ui->getAttribute('name'),
				'type' => $ui->getAttribute('type'),
				'default' => ($ui->hasAttribute('default') && (int) $ui->getAttribute('default') == 1)
			);

			if ($ui->getAttribute('name') == $name) {
				if (!$ui->hasAttribute('default')) {
					$default = $xml->createAttribute('default');
					$default->appendChild($xml->createTextNode($value));
					$ui->appendChild($default);
				} else {
					$ui->setAttribute('default', $value);
				}

				$file->setContents($xml->saveXML());

				return;
			}
		}

		throw new \InvalidArgumentException('L\'interface "'.$name.'" est introuvable');
	}
}
