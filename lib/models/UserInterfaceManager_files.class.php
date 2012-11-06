<?php
namespace lib\models;

class UserInterfaceManager_files extends UserInterfaceManager {
	public function getDefault() {
		if ($this->webos->getUser()->isConnected() || $this->webos->getUser()->isGuest()) { //L'utilisateur est connecte
			$interfaceType = 'ui'; //On cherche une interface de bureau (User Interface)
		} else {
			$interfaceType = 'gi'; //Sinon on cherche une interface pour invite (Guest Interface)
		}

		$file = $this->dao->get('/etc/uis.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$uis = $xml->getElementsByTagName('ui');
		foreach ($uis as $ui) { //Pour chaque interface
			//Si elle porte l'attribut "defaut"
			if ($ui->hasAttribute('default') && (int) $ui->getAttribute('default') == 1) {
				//Si elle est du type demande
				if (in_array($interfaceType, explode(',', $ui->getAttribute('types'))))
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
				'types' => $ui->getAttribute('types'),
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

	public function setTypes($name, $types) {
		$types = implode(',', $types);

		$file = $this->dao->get('/etc/uis.xml');
		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$uis = $xml->getElementsByTagName('ui');

		foreach ($uis as $ui) {
			if ($ui->getAttribute('name') == $name) {
				if (!$ui->hasAttribute('types')) {
					$default = $xml->createAttribute('types');
					$default->appendChild($xml->createTextNode($types));
					$ui->appendChild($default);
				} else {
					$ui->setAttribute('types', $types);
				}

				$file->setContents($xml->saveXML());

				return;
			}
		}

		throw new \InvalidArgumentException('L\'interface "'.$name.'" est introuvable');
	}
	
	public function add($uiName) {
		$file = $this->dao->get('/etc/uis.xml');
		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());

		$root = $xml->getElementsByTagName('uis')->item(0);
		
		$element = $xml->createElement('ui');
		$root->appendChild($element);
		
		$name = $xml->createAttribute('name');
		$name->appendChild($xml->createTextNode($uiName));
		$element->appendChild($name);
		
		$type = $xml->createAttribute('types');
		$type->appendChild($xml->createTextNode('ui'));
		$element->appendChild($type);
		
		$default = $xml->createAttribute('default');
		$default->appendChild($xml->createTextNode('0'));
		$element->appendChild($default);
		
		$file->setContents($xml->saveXML());
	}
	
	public function remove($name) {
		$file = $this->dao->get('/etc/uis.xml');
		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		
		$root = $xml->getElementsByTagName('uis')->item(0);
		$uis = $xml->getElementsByTagName('ui');

		foreach ($uis as $ui) {
			if ($ui->getAttribute('name') == $name) {
				$root->removeChild($ui);
				$file->setContents($xml->saveXML());
				return;
			}
		}

		throw new \InvalidArgumentException('L\'interface "'.$name.'" est introuvable');
	}
}
