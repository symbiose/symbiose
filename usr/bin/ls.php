<?php
$path = $this->terminal->getLocation();

$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
$authorisations->control($requiredAuthorisation);

/**
 *
 */
function print_file_ls($file, $LOption, $colors) {
	$color = 'white';
	
	if ($file->isDir()) {
		$color = 'blue';
		$balise = 'strong';
	} else {
		$ext = $file->extension();
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
	if ($LOption)
		echo $file->size().' '.date ('D m y H:i', $file->mtime()).' <'.$balise.' style="color: #'.$colors[$color].';">'.$file->basename().'</'.$balise.'>&emsp;<br />' ;
	else
		echo '<'.$balise.' style="color: #'.$colors[$color].';">'.$file->basename().'</'.$balise.'>&emsp; ' ;
}



$colors = array('blue'=>'729fcf','green'=>'8ae234','white'=>'a9a9a9','magenta'=>'ac7fa7','red'=>'ee2929');

$Params = $this->arguments->getParams() ;// On récupères les paramètres qui ne sont pas de Options
if(sizeof($Params) == 0)
	$Params = array('./') ;

foreach ($Params as $param) {
	$files = 0 ;// on initialise le tableaux de fichiers
	$fileName = htmlspecialchars($param, ENT_QUOTES) ;// on récupère le contenu d'un paramètres
	
	try {
		$files = $this->webos->managers()->get('File')->get($path.(($fileName != '') ?'/'.$fileName : '')) ;//On ouvre le dossier ->contents()
		
	}
	catch(Exception $e) {
		echo '<strong style="color: #'.$colors['red'].';">Le dossier : '.$fileName.' n\'existe pas!</strong><br />' ;
		continue ;
	}

	
	if($files->isDir()) {
		$files = $files->contents() ;
		if ($this->arguments->isOption('r'))
			$files = array_reverse($files, true);
		foreach ($files as $file) {
			if (!$this->arguments->isOption('a') && preg_match('#^\.#', $file->basename()))
				continue;
			print_file_ls($file, $this->arguments->isOption('l'), $colors) ;
		}
	}
	else
		print_file_ls($files, $this->arguments->isOption('l'), $colors) ;
	
}