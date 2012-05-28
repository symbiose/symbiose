<?php
//Permet de creer rapidement un paquet.

//Arguments
$config = array(
	'config-file' => $this->terminal->getAbsoluteLocation('package.xml'),
	'files-path' => 'package',
	'files-listing' => true,
	'dest' => $this->terminal->getAbsoluteLocation('package.zip')
);

if ($this->arguments->isOption('config-file')) {
	$config['config-file'] = $this->terminal->getAbsoluteLocation($this->arguments->getOption('config-file'));
}

if ($this->arguments->isOption('files-path')) {
	$config['files-path'] = $this->terminal->getAbsoluteLocation($this->arguments->getOption('files-path'));
}

if ($this->arguments->isOption('files-listing')) {
	$config['files-listing'] = ((int) $this->arguments->getOption('files-path')) ? true : false;
}

if ($this->arguments->isOption('dest')) {
	$config['dest'] = $this->terminal->getAbsoluteLocation($this->arguments->getOption('dest'));
}

if ($this->arguments->isOption('installed')) {
	$config['files-path'] = '';
}

//Autorisations
$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($config['dest'], 'file', 'write');
$authorisations->control($requiredAuthorisation);
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($config['config-file'], 'file', 'read');
$authorisations->control($requiredAuthorisation);

//Config
echo 'Chargement de la configuration...<br />';
$xml = new \DOMDocument;
$result = $xml->loadXML($this->webos->managers()->get('File')->get($config['config-file'])->contents());

if ($result !== true) {
	throw new Exception('Impossible d\'ouvrir le fichier de configuration du paquet "'.$config['config-file'].'". Cr&eacute;ez le ou v&eacute;rifiez sa syntaxe s\'il existe.');
}

if (!$this->webos->managers()->get('File')->exists($this->terminal->getAbsoluteLocation($config['files-path'].'/'))) {
	throw new Exception('Impossible d\'ouvrir le dossier des fichiers du paquet "'.$config['files-path'].'/". Cr&eacute;ez ce dossier et placez-y le contenu de votre paquet.');
}

//Fichiers
function addDirToList($dir, $list, $fileManager, $terminal, $config, $authorisations) {
	$dir = str_replace('./', '', $dir);

	if ($dir != '.') {
		$list[] = $dir;
	}

	$path = $terminal->getAbsoluteLocation($config['files-path'].'/'.$dir);

	//Autorisations
	$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
	$authorisations->control($requiredAuthorisation);

	$files = $fileManager->get($path)->contents();

	foreach($files as $file) {
		if ($file->isDir()) {
			echo 'Ajout de "'.$dir.'/'.$file->basename().'"...<br />';
			$list = addDirToList($dir.'/'.$file->basename(), $list, $fileManager, $terminal, $config, $authorisations);
		} else {
			echo 'Ajout de "'.$dir.'/'.$file->basename().'"...<br />';
			$list[] = $dir.'/'.$file->basename();
		}
	}
	return $list;
}

echo 'Listage des fichiers...<br />';
if ($config['files-listing']) {
	$list = addDirToList('.', array(), $this->webos->managers()->get('File'), $this->terminal, $config, $authorisations);
} else {
	$list = array();
	$files = $xml->getElementsByTagName('file');
	foreach ($files as $file) {
		$path = $file->getAttribute('path');

		//Autorisations
		$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
		$authorisations->control($requiredAuthorisation);

		$list[] = $path;
	}
}

echo 'Calcul de la taille des fichiers...<br />';
$size = 0;
foreach($list as $filepath) {
	$file = $this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation($config['files-path'].'/'.$filepath));
	if (!$file->isDir()) {
		$size += $file->size();
	}
}

//On zippe les fichiers
echo 'Cr&eacute;ation de l\'archive...<br />';
$filename = $this->webos->managers()->get('File')->createFile($config['dest'])->realpath();
$zip = new ZipArchive();

$result = $zip->open($filename, ZipArchive::OVERWRITE);
if ($result !== true) {
	throw new Exception('Impossible de cr&eacute;er l\'archive');
}

echo 'Ajout des fichiers dans l\'archive...<br />';
foreach($list as $file) {
	echo 'Ajout de "'.$file.'" &agrave; l\'archive...<br />';
	$filename = (string) $file;
	if (substr($filename, 0, 1) != '/') {
		$filename = '/'.$filename;
	}
	if (!$this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation($config['files-path'].'/'.$file))->isDir()) {
		$zip->addFile($this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation($config['files-path'].'/'.$file))->realpath(), $filename);
	} else {
		$zip->addEmptyDir($filename);
	}
}

echo 'Fermeture de l\'archive...<br />';
$zip->close();

$this->webos->managers()->get('File')->get($config['dest'])->chmod(0777);

$zippedsize = $this->webos->managers()->get('File')->get($config['dest'])->size();

//Ajout de la config
$root = $xml->getElementsByTagName('package')->item(0);

//Ajout des fichiers
if ($config['files-listing']) {
	echo 'Ajout de la liste des fichiers dans la configuration...<br />';
	$files = $xml->createElement('files');
	$root->appendChild($files);

	foreach($list as $file) {
		$element = $xml->createElement('file');
		$files->appendChild($element);

		$path = $xml->createAttribute('path');
		$path->appendChild($xml->createTextNode($file));
		$element->appendChild($path);
	}
}

//Config automatique
echo 'Ajout de la configuration automatique...<br />';

$configToAdd = array(
	'lastupdate' => time(),
	'installedsize' => $size,
	'packagesize' => $zippedsize
);

$attributes = $xml->getElementsByTagName('attributes')->item(0);

foreach ($configToAdd as $attribute => $value) {
	$node = $xml->createElement('attribute');
	$attributes->appendChild($node);

	$name = $xml->createAttribute('name');
	$name->appendChild($xml->createTextNode($attribute));
	$node->appendChild($name);

	$val = $xml->createAttribute('value');
	$val->appendChild($xml->createTextNode($value));
	$node->appendChild($val);
}

//Enregistrement de la config
echo 'Enregistrement de la configuration...<br />';
$this->webos->managers()->get('File')->get($config['config-file'])->setContents($xml->saveXML());

echo 'Paquet g&eacute;n&eacute;r&eacute;.<br />';