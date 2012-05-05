<?php
//Cache d'APT : lire des informations sur le cache.
switch($this->arguments->getParam(0)) {
	case 'show': //Afficher les informations sur un paquet
		//On recupere le paquet
		$package = $this->webos->managers()->get('Package')->getPackage($this->arguments->getParam(1));
		
		//On affiche les informations
		echo 'Package: '.$package->getName().'<br />';
		echo 'Version: '.$package->getAttribute('version').'<br />';
		echo 'Category: '.$package->getAttribute('category').'<br />';
		echo 'Priority: '.$package->getAttribute('priority').'<br />';
		echo 'Installed-size: '.$package->getAttribute('installedsize').'<br />';
		echo 'Maintainer: '.$package->getAttribute('maintainer').'<br />';
		echo 'Short description: '.$package->getAttribute('shortdescription').'<br />';
		echo 'Description: '.$package->getAttribute('description').'<br />';
		break;
	default: //Par defaut, on n'execute aucune action
		echo 'Aucune action sp&eacute;cifi&eacute;e.';
}