<?php
$authManager = $this->managers()->getManagerOf('authorization');
$fileManager = $this->managers()->getManagerOf('file');
$options = $this->cmd->options();
$optionsNames = array_keys($options);
$processAuths = $authManager->getByPid($this->cmd['id']);

$colors = array('blue'=>'729fcf','green'=>'8ae234','white'=>'a9a9a9','magenta'=>'ac7fa7','red'=>'ee2929');

$print_file_ls = function ($file) use ($fileManager, $colors, $optionsNames) {
	$color = 'white';
	
	if ($fileManager->isDir($file)) {
		$color = 'blue';
		$balise = 'strong';
	} else {
		$ext = $fileManager->extension($file);
		if($ext == 'php' OR $ext == 'js')
			$color = 'green';
		elseif($ext == 'jpeg' OR $ext == 'jpg' OR $ext == 'gif' OR $ext == 'png' OR $ext == 'tiff'
			OR $ext == 'mp3' OR $ext == 'ogg' OR $ext == 'wav')
			$color = 'magenta';
		elseif($ext == 'tar' OR $ext == 'zip')
			$color = 'red';

		if ($color !== 'white')
			$balise = 'strong';
		else
			$balise = 'span';
	}
	if (in_array('l', $optionsNames))
		echo $fileManager->size($file).' '.date ('D m y H:i', $fileManager->mtime($file)).' <'.$balise.' style="color: #'.$colors[$color].';">'.$fileManager->basename($file).'</'.$balise.'><br />' ;
	else
		echo '<'.$balise.' style="color: #'.$colors[$color].';">'.$fileManager->basename($file).'</'.$balise.'>&emsp; ' ;
};

$params = $this->cmd->params(); //On récupères les paramètres qui ne sont pas de Options
if(count($params) == 0)
	$params = array('./') ;

foreach ($params as $param) {
	$dirPath = $this->terminal->absoluteLocation($param);

	//Authorizations
	$this->guardian->controlArgAuth('file.read', $dirPath, $processAuths);
	
	if($fileManager->isDir($dirPath)) {
		$files = $fileManager->readDir($dirPath); //On ouvre le dossier

		if (in_array('r', $optionsNames)) {
			$files = array_reverse($files, true);
		}

		foreach ($files as $filepath) {
			if (!in_array('a', $optionsNames) && preg_match('#^\.#', $fileManager->basename($filepath)))
				continue;

			$print_file_ls($filepath);
		}
	} else {
		$print_file_ls($dirPath);
	}
}