<?php
namespace lib\models;

/**
 * File represente un fichier.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 24 nov. 2011
 */
class File extends FileBase {
	public function open($path) {
		parent::open($path);

		if ($this->isDir())
			throw new \InvalidArgumentException('"'.$path.'" : est un dossier');

		return $this;
	}

	public function create($path) {
		$this->path = $this->path($path);

		if (!touch($this->realpath($path)))
			throw new \RuntimeException('Impossible de cr&eacute;er "'.$this->path($path).'"');

		$this->chmod(0777);

		return $this;
	}

	// GETTERS
	/**
	 * Recuperer la taille du fichier.
	 * @return int La taille du fichier, en octets.
	 */
	public function size() {
		return (int) filesize($this->realpath());
	}

	/**
	 * Recuperer l'extension du fichier.
	 * @return string L'extension du fichier.
	 */
	public function extension() {
		return pathinfo($this->realpath(), PATHINFO_EXTENSION);
	}

	/**
	 * Recuperer le nom du fichier (sans l'extension).
	 * @return string Le nom du fichier, sans l'extension.
	 */
	public function filename() {
		return pathinfo($this->realpath(), PATHINFO_FILENAME);
	}

	/**
	 * Recuperer le type MIME du fichier.
	 * @return string Le type MIME du fichier.
	 */
	public function mime() {
		switch ($this->extension()) { //Quelques types MIME indispensables pour la comprehension par le navigateur du webos
			case 'css':
				return 'text/css';
			case 'js':
				return 'text/javascript';
			case 'html':
				return 'text/html';
		}

		$htaccessPath = '/.htaccess';
		if ($this->webos->managers()->get('File')->exists($htaccessPath)) {
			$contents = $this->webos->managers()->get('File')->get($htaccessPath)->contents();
			$lines = explode("\n", $contents);

			foreach ($lines as $line) {
				$line = trim($line);
				if (stripos($line, 'AddType ') === 0) {
					$data = explode(' ', $line);
					if ($data[2] == $this->extension()) {
						return $data[1];
					}
				}
			}
		}

		if (!class_exists('finfo')) {
			return 'application/octet-stream';
		}
		$finfo = new \finfo(FILEINFO_MIME);
		if (!$finfo) { //Echec de l'ouverture de la BDD de finfo
			return 'application/octet-stream';
		}
		return $finfo->file($this->realpath());
	}

	/**
	 * Definir si le fichier est un fichier binaire.
	 * @return bool Vrai si le fichier est binaire.
	 */
	public function isBinary() {
		$mime = $this->mime();
		return (substr($mime, 0, 5) != 'text/');
	}

	// SETTERS
	/**
	 * Definir le contenu du fichier.
	 * @param string $contents Le contenu.
	 * @return File Le fichier.
	 */
	public function setContents($contents) {
		$this->webos->managers()->get('File')->checkAvailableSpace($this->dirname(), strlen($contents));

		if (file_put_contents($this->realpath(), $contents) === false)
			throw new \RuntimeException('Impossible de modifier "'.$this->path().'"');
		return $this;
	}

	public function delete() {
		if (!unlink($this->realpath()))
			throw new \RuntimeException('Impossible de supprimer "'.$this->path().'"');
	}

	public function copy($dest) {
		$dest = $this->relativePath($dest);
		if ($this->webos->managers()->get('File')->exists($dest)) {
			$file = $this->webos->managers()->get('File')->get($dest);
			if ($file->isDir()) {
				$dest = $this->path($file->path().'/'.$this->basename());
			}
		}

		$destParentArray = explode('/', $dest);
		array_pop($destParentArray);
		$destParent = implode('/', $destParentArray);
		if (!$this->webos->managers()->get('File')->exists($destParent)) {
			throw new \InvalidArgumentException('Le dossier de destination "'.$this->path($destParent).'" n\'existe pas');
		}

		$this->webos->managers()->get('File')->checkAvailableSpace($destParent, $this->size());

		if (!copy($this->realpath(), $this->realpath($dest)))
			throw new \RuntimeException('Impossible de copier "'.$this->path().'" vers "'.$this->path($dest).'"');
		return $this->webos->managers()->get('File')->get($dest);
	}

	public function move($dest) {
		$dest = $this->relativePath($dest);
		if ($this->webos->managers()->get('File')->exists($dest)) {
			$file = $this->webos->managers()->get('File')->get($dest);
			if ($file->isDir()) {
				$dest = $this->path($file->path().'/'.$this->basename());
			}
		}

		$destParentArray = explode('/', $dest);
		array_pop($destParentArray);
		$destParent = implode('/', $destParentArray);
		if (!$this->webos->managers()->get('File')->exists($destParent)) {
			throw new \InvalidArgumentException('Le dossier de destination "'.$this->path($destParent).'" n\'existe pas');
		}

		$this->webos->managers()->get('File')->checkAvailableSpace($destParent, $this->size());

		if (!rename($this->realpath(), $this->realpath($dest)))
			throw new \RuntimeException('Impossible de d&eacute;placer "'.$this->path().'" vers "'.$this->path($dest).'"');
		
		return $this->webos->managers()->get('File')->get($dest);
	}

	/**
	 * Recuperer le contenu du fichier.
	 * @return string Le contenu du fichier.
	 */
	public function contents() {
		$contents = file_get_contents($this->realpath());
		if ($contents === false)
			throw new \RuntimeException('Impossible de lire "'.$this->path().'"');
		return $contents;
	}

	public function zip($dest = false) {
		$zip = null;
		$zipdest = null;
		if ($dest !== false) {
			if (is_array($dest)) {
				$zip = new \ZipArchive;
				$zip->open($this->realpath($dest['path']), \ZipArchive::CREATE);
				$zipdest = preg_replace('#/{2,}#', '/', $dest['dirname'].'/');
			} else {
				$dest = $this->relativePath($dest);
				if ($this->webos->managers()->get('File')->exists($dest)) {
					$file = $this->webos->managers()->get('File')->get($dest);
					if ($file->isDir()) {
						$dest = $this->path($file->path().'/'.$this->basename().'.zip');
					}
				}
			}
		} else {
			$dest = $this->relativePath($this->basename().'.zip');
		}

		if (empty($zip)) {
			$this->webos->managers()->get('File')->checkAvailableSpace($this->dirname(), $this->size());

			$zip = new \ZipArchive;
			if (!$zip->open($this->realpath($dest), \ZipArchive::CREATE)) {
				throw new \RuntimeException('Impossible de cr&eacute;er l\'archive zip');
			}
		}

		$zip->addFile($this->realpath(), $zipdest.$this->basename());

		$zip->close();

		return $this->webos->managers()->get('File')->get((is_array($dest)) ? $dest['path'] : $dest);
	}
}