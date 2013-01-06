<?php
if (!$this->webos->getAuthorization()->can('package.write')) {
	throw new Exception('Vous n\'avez pas les droits nécessaires pour utiliser apt-get');	
}

//APT: gerer les paquets
switch($this->arguments->getParam(0)) {
	case 'update': //Mettre a jour le cache
		$this->webos->managers()->get('Package')->update();
		break;
	case 'install': //Installer un paquet
		if (!$this->webos->managers()->get('Package')->isPackage($this->arguments->getParam(1))) {
			throw new InvalidArgumentException('Le paquet "'.$this->arguments->getParam(1).'" n\'existe pas');
		}
		
		$package = $this->webos->managers()->get('Package')->getPackage($this->arguments->getParam(1));
		
		if ($package->isInstalled()) {
			throw new InvalidArgumentException('Le paquet "'.$this->arguments->getParam(1).'" est d&eacute;j&agrave; install&eacute;');
		}
		
		$package->install();
		break;
	case 'remove': //Supprimer un paquet
		if (!$this->webos->managers()->get('Package')->isPackage($this->arguments->getParam(1))) {
			throw new InvalidArgumentException('Le paquet "'.$this->arguments->getParam(1).'" n\'existe pas');
		}
		
		$package = $this->webos->managers()->get('Package')->getPackage($this->arguments->getParam(1));
		
		if (!$package->isInstalled()) {
			throw new InvalidArgumentException('Le paquet "'.$this->arguments->getParam(1).'" n\'est pas install&eacute;');
		}
		
		$package->remove();
		break;
	case 'upgrade':
		$updates = $this->webos->managers()->get('Package')->getUpdates();
		
		if (count($updates) == 0) {
			echo 'Le syst&egrave;me est &agrave; jour.';
			break;
		}
		
		foreach($updates as $update) {
			$update->install();
		}
		break;
	default: //Par defaut, on n'execute aucune action
		echo 'Aucune action sp&eacute;cifi&eacute;e.';
}
