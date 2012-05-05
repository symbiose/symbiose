<?php
$path = $this->terminal->getLocation();

$authorisations = $this->webos->getAuthorization();
$requiredAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
$authorisations->control($requiredAuthorisation);

$files = $this->webos->managers()->get('File')->get($path)->contents();

if ($this->arguments->isOption('r')) {
	$files = array_reverse($files, true);
}

$colors = array('blue'=>'729fcf','green'=>'8ae234','white'=>'a9a9a9','magenta'=>'ac7fa7','red'=>'ee2929');

foreach ($files as $file) {
	if (!$this->arguments->isOption('a') && preg_match('#^\.#', $file->basename()))
		continue;
	
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
	
	echo '<'.$balise.' style="color:#'.$colors[$color].';">'.$file->basename().'</'.$balise.'>&emsp;';
}