<?php
namespace lib\dao;

/**
 * FileDAO est l'objet qui permet d'acceder aux fichiers.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 24 nov. 2011
 */
class FileDAO {
	protected $webos;

	public function __construct(\lib\Webos $webos) {
		$this->webos = $webos;
	}

	// GETTERS
	/**
	 * Recuperer un fichier.
	 * @param string $path Le chemin vers le fichier.
	 * @return FileBase|bool Le fichier s'il existe, faux sinon.
	 */
	public function get($path) {
		try {
			$file = new \lib\models\File($this->webos, $path);
		} catch(\Exception $e) {
			$file = new \lib\models\Folder($this->webos, $path);
		}
		return $file;
	}

	/**
	 * Determiner si un fichier existe.
	 * @param string $path Le chemin vers le fichier.
	 * @return bool Vrai si le fichier existe.
	 */
	public function exists($path) {
		try {
			new \lib\models\File($this->webos, $path);
		} catch(\Exception $e) {
			try {
				new \lib\models\Folder($this->webos, $path);
			} catch(\Exception $e) {
				return false;
			}
		}
		return true;
	}

	// SETTERS
	/**
	 * Creer un dossier vide.
	 * @param string $path Le chemin vers le nouveau dossier.
	 * @return Folder Le dossier.
	 */
	public function createDir($path) {
		$file = new \lib\models\Folder($this->webos);
		$file->create($path);
		return $file;
	}

	/**
	 * Creer un fichier vierge.
	 * @param string $path Le chemin vers le nouveau fichier.
	 * @return File le fichier.
	 */
	public function createFile($path) {
		$file = new \lib\models\File($this->webos);
		$file->create($path);
		return $file;
	}
}