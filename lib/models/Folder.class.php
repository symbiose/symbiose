<?php
namespace lib\models;

class Folder extends FileBase {
	public function open($path) {
		parent::open($path);

		if (!$this->isDir())
			throw new \InvalidArgumentException('"'.$path.'" : est un fichier');

		return $this;
	}

	public function create($path) {
		$this->path = $this->path($path);

		if (!mkdir($this->realpath($path)))
			throw new \RuntimeException('Impossible de cr&eacute;er "'.$this->path($path).'"');

		$this->chmod(0777);

		return $this;
	}

	// GETTERS
	/**
	 * Recuperer le nombre de fichiers contenus dans ce dossier.
	 * @return int Le nombre de fichiers.
	 */
	public function size() {
		$list = $this->contents();
		return count($list);
	}

	/**
	 * Recuperer la taille des fichiers contenus dans le dossier. Attention, cette fonction peut etre gourmande en ressources, pour les dossiers contenant beaucoup d'elements.
	 * @return int La taille du contenu du dossier (en octets).
	 */
	public function contentsSize() {
		$list = $this->contents();
		$total = 0;
		foreach ($list as $file) {
			if ($file->isDir()) {
				$total += $file->contentsSize();
			} else {
				$total += $file->size();
			}
		}
		return $total;
	}

	// SETTERS
	/**
	 * Changer le mode (droits d'acces) du dossier.
	 * @param bool $recursive Si defini a vrai, les sous-dossiers seront affectes.
	 * @return Folder Le dossier.
	 */
	public function chmod($mod, $recursive = false) {
		parent::chmod($mod);
		if ($recursive) {
			$list = $this->contents();
			foreach($list as $file) {
				$file->chmod($mod);
			}
		}
		return $this;
	}

	/**
	 * Supprimer ce dossier et son contenu.
	 */
	public function delete() {
		$list = $this->contents();
		foreach($list as $file) {
			$file->delete();
		}
		if (!rmdir($this->realpath()))
			throw new \RuntimeException('Impossible de supprimer "'.$this->path().'"');
	}

	/**
	 * Copier ce dossier et son contenu.
	 * @param string $dest Le dossier de destination.
	 * @return Folder Le dossier copie.
	 */
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

		$folder = $this->webos->managers()->get('File')->createDir($dest);

		$list = $this->contents();
		foreach ($list as $file) {
			if (!$file->isDir()) {
				$this->webos->managers()->get('File')->checkAvailableSpace($folder->path(), $file->size());
			}
			$file->copy($this->path($dest).'/'.$file->basename());
		}
		return $folder;
	}

	/**
	 * Deplacer ce dossier et son contenu.
	 * @param string Le dossier de destination.
	 * @return Folder Le dossier deplace.
	 */
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

		$folder = $this->webos->managers()->get('File')->createDir($dest);

		$list = $this->contents();
		foreach ($list as $file) {
			if (!$file->isDir()) {
				$this->webos->managers()->get('File')->checkAvailableSpace($folder->path(), $file->size());
			}
			$file->move($this->path($dest).'/'.$file->basename());
		}

		$this->delete();

		return $folder;
	}

	/**
	 * Recuperer les fichiers contenus dans ce dossier (en ignorant "." et "..").
	 * @return array Un tableau contenant les fichiers, indexes selon leur nom, tries par ordre alphabetique.
	 */
	public function contents() {
		$handle = opendir($this->realpath()); //On ouvre le dossier
		$list = array(); //On initialise la liste

		while (($file = readdir($handle)) !== false) { // Pour chaque fichier
			if ($file == '.' || $file == '..')
				continue;

			$path = $this->path($this->path().'/'.$file); //Chemin vers le fichier

			$file = $this->webos->managers()->get('File')->get($path);

			$list[$file->basename()] = $file;
		}

		closedir($handle); //On ferme le dossier

		ksort($list); //On trie les fichiers par ordre alphabetique

		return $list;
	}

	public function zip($dest = false) {
		$zip = null;
		$zipdest = null;
		if ($dest !== false) {
			if (is_array($dest)) {
				if (empty($dest['dirname'])) {
					$zipdest = preg_replace('#/{2,}#', '/', $this->basename().'/');
				} else {
					$zipdest = preg_replace('#/{2,}#', '/', $dest['dirname'].'/'.$this->basename().'/');
				}
				$zip = new \ZipArchive;
				$zip->open($this->realpath($dest['path']), \ZipArchive::CREATE);
				$zip->addEmptyDir($zipdest);
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
			$this->webos->managers()->get('File')->checkAvailableSpace($this->dirname(), $this->contentsSize());

			$zip = new \ZipArchive;
			if ($zip->open($this->realpath($dest), \ZipArchive::CREATE) !== true) {
				throw new \RuntimeException('Impossible de cr&eacute;er l\'archive zip');
			}
			$zipdest = preg_replace('#/{2,}#', '/', $this->basename().'/');
			$zip->addEmptyDir($zipdest);
		}

		$zip->close();

		$files = $this->contents();

		foreach($files as $file) {
			$file->zip(array(
				'path' => (is_array($dest)) ? $dest['path'] : $dest,
				'dirname' => $zipdest
			));
		}

		return $this->webos->managers()->get('File')->get((is_array($dest)) ? $dest['path'] : $dest);
	}
}