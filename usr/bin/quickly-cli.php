<?php
//Permet de creer rapidement un paquet.

//Config
echo 'Chargement de la configuration...<br />';
$xml = new \DOMDocument;
$result = $xml->loadXML($this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package.xml'))->contents());

if ($result !== true) {
	throw new Exception('Impossible d\'ouvrir le fichier de configuration du paquet "package.xml". Cr&eacute;ez le ou v&eacute;rifiez sa syntaxe s\'il existe.');
}

if (!$this->webos->managers()->get('File')->exists($this->terminal->getAbsoluteLocation('package/'))) {
	throw new Exception('Impossible d\'ouvrir le dossier des fichiers du paquet "package/". Cr&eacute;ez ce dossier et placez-y le contenu de votre paquet.');
}

//Fichiers
function addDirToList($dir, $list, $fileManager, $terminal) {
	$dir = str_replace('./', '', $dir);
	
	if ($dir != '.') {
		$list[] = $dir;
	}
	
	$path = $terminal->getAbsoluteLocation('package/'.$dir);
	$files = $fileManager->get($path)->contents();
	
	foreach($files as $file) {
		if ($file->isDir()) {
			if ($file->basename() == '.svn') {
				continue;
			}
			echo 'Ajout de "'.$dir.'/'.$file->basename().'"...<br />';
			$list = addDirToList($dir.'/'.$file->basename(), $list, $fileManager, $terminal);
		} else {
			echo 'Ajout de "'.$dir.'/'.$file->basename().'"...<br />';
			$list[] = $dir.'/'.$file->basename();
		}
	}
	return $list;
}

echo 'Listage des fichiers...<br />';
$list = addDirToList('.', array(), $this->webos->managers()->get('File'), $this->terminal);


echo 'Calcul de la taille des fichiers...<br />';
$size = 0;
foreach($list as $file) {
	if (!$this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package/'.$file))->isDir()) {
		$size += $this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package/'.$file))->size();
	}
}

//On zippe les fichiers
echo 'Cr&eacute;ation de l\'archive...<br />';
$filename = $this->webos->managers()->get('File')->createFile($this->terminal->getAbsoluteLocation('package.zip'))->realpath();
$zip = new ZipArchive();

$result = $zip->open($filename, ZipArchive::OVERWRITE);
if ($result !== TRUE) {
	throw new Exception('Impossible de cr&eacute;er l\'archive');
}

echo 'Ajout des fichiers dans l\'archive...<br />';
foreach($list as $file) {
	echo 'Ajout de "'.$file.'" &agrave; l\'archive...<br />';
	if (!$this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package/'.$file))->isDir()) {
		$zip->addFile($this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package/'.$file))->realpath(), '/'.$file);
	} else {
		$zip->addEmptyDir('/'.$file);
	}
}

echo 'Fermeture de l\'archive...<br />';
$zip->close();

$this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package.zip'))->chmod(0777);

$zippedsize = $this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package.zip'))->size();

//Ajout de la config
$root = $xml->getElementsByTagName('package')->item(0);

//Ajout des fichiers
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

//Config automatique
echo 'Ajout de la configuration automatique...<br />';

$config = array(
	'lastupdate' => time(),
	'installedsize' => $size,
	'packagesize' => $zippedsize
);

$attributes = $xml->getElementsByTagName('attributes')->item(0);

foreach ($config as $attribute => $value) {
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
$this->webos->managers()->get('File')->get($this->terminal->getAbsoluteLocation('package.xml'))->setContents($xml->saveXML());

echo 'Paquet g&eacute;n&eacute;r&eacute;.<br />';
