<?php
namespace lib\models;

/**
 * FileBase represente un fichier ou un dossier.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 24 nov. 2011
 */
abstract class FileBase extends \lib\WebosComponent {
	protected $path;

	/**
	 * Initialiser une instance de FileBase.
	 * @param Webos $webos Le webos.
	 * @param string $path Le chemin du fichier a ouvrir.
	 */
	public function __construct(\lib\Webos $webos, $path = null) {
		parent::__construct($webos);

		if (!empty($path))
			$this->open($path);
	}

	/**
	 * Ouvrir un fichier.
	 * @param string $path Le fichier a ouvrir.
	 * @return FileBase Le fichier ouvert.
	 */
	public function open($path) {
		$this->path = $this->path($path);

		if (!file_exists($this->realpath()))
			throw new \InvalidArgumentException('"'.$path.'" : aucun fichier ou dossier de ce type');

		return $this;
	}

	/**
	 * Creer un fichier.
	 * @param string $path Le fichier a creer.
	 * @return FileBase Le fichier cree.
	 */
	abstract public function create($path);

	// GETTERS
	/**
	 * Recuperer le chemin virtuel d'un fichier.
	 * @param string $file Le chemin reel vers le fichier.
	 * @return Le chemin virtuel du fichier specifie, sinon du fichier courant.
	 */
	public function path($file = false) {
		if ($file !== false) { //Si un chemin est specifie
			$path = $file;
		} else {
			$path = $this->path;
		}

		$path = $this->realpath($path);

		//Quelques nettoyages...
		$dirs = explode('/', $path);
		$path = array();
		foreach ($dirs as $dir) {
			if ($dir == '..') {
				array_pop($path);
			} elseif ($dir == '.') {
				continue;
			} elseif (empty($dir)) {
				continue;
			} else {
				$path[] = $dir;
			}
		}
		$path = implode('/', $path);

		//On ajoute le / devant
		if (!preg_match('#^/#',$path))
			$path = '/'.$path;

		//Si l'utilisateur est connecte, ~ signifie le dossier personnel
		if ($this->webos->getUser()->isConnected())
			$path = preg_replace('#^'.$this->webos->managers()->get('File')->userDirectory().'#', '~', $path);

		//Dernier nettoyage
		$path = preg_replace('#/\.$#','/',$path);

		return $path;
	}

	/**
	 * Recuperer le chemin reel d'un fichier.
	 * @param string $file Le chemin vers le fichier.
	 * @return string Le chemin reel du fichier specifie, sinon du fichier courant.
	 */
	public function realpath($file = false) {
		if ($file !== false) { //Si un chemin est specifie
			$path = $file;
		} else {
			$path = $this->path;
		}

		//On remplace ~ par le chemin du dossier personnel de l'utilisateur
		if ($this->webos->getUser()->isConnected())
			$path = preg_replace('#^~#', $this->webos->managers()->get('File')->userDirectory(), $path);
		//On enleve le / en debut de chemin
		if (preg_match('#^/#',$path))
			$path = preg_replace('#^/#', '', $path);

		//On rajoute "./" devant
		$path = './'.$path;

		return $path;
	}

	/**
	 * Recuperer le chemin vers le fichier par rapport au fichier courant.
	 * @param string $file Le fichier.
	 * @return string Le chemin vers le fichier specifie par rapport au fichier courant.
	 */
	public function relativePath($file) {
		if (!preg_match('#^[/~]#', $file)) {
			if ($this->isDir()) {
				return $this->path($this->path().'/'.$file);
			} else {
				return $this->path($this->dirname().'/'.$file);
			}
		} else {
			return $this->path($file);
		}
	}

	/**
	 * Recuperer le chemin vers le dossier parent.
	 * @return string Le chemin vers le dossier parent.
	 */
	public function dirname() {
		return $this->path(dirname($this->realpath()));
	}

	/**
	 * Lire le contenu du fichier ou du dossier.
	 * @return string|array Le contenu du dossier sous forme de tableau ou la liste des fichiers contenus dans le dossier.
	 */
	abstract public function contents();

	/**
	 * Recuperer la date de dernier acces au fichier.
	 * @return int Le timestamp correspondant a la date de dernier acces.
	 */
	public function atime() {
		return fileatime($this->realpath());
	}

	/**
	 * Recuperer la date de derniere modification du fichier.
	 * @return int Le timestamp correspondant a la date de derniere modification.
	 */
	public function mtime() {
		return filemtime($this->realpath());
	}

	/**
	 * Recuperer la taille du fichier ou le nombre de fichiers du dossier.
	 * @return int La taille du fichier en octets, ou le nombre de fichiers du dossier.
	 */
	abstract public function size();

	/**
	 * Determiner si ce fichier est un dossier.
	 * @return bool Vrai si ce fichier est un dossier.
	 */
	public function isDir() {
		return is_dir($this->realpath());
	}

	/**
	 * Recuperer le nom du fichier (avec l'extension).
	 * @return string Le nom du fichier.
	 */
	public function basename() {
		return basename($this->realpath());
	}

	/**
	 * Recuperer le dossier parent.
	 * @return Folder Le dossier parent.
	 */
	public function parentFolder() {
		return new Folder($this->dirname());
	}

	/**
	 * Determiner si ce fichier fait partie du systeme.
	 * @return bool Vrai si le fichier fait partie du systeme.
	 */
	public function isSystem() {
		return preg_match('#^~#', $this->path());
	}

	/**
	 * Determiner si un fichier est contenu dans un repertoire personnel (pas forcement dans le repertoire personnel de l'utilisateur courant).
	 * @param string $file Le chemin vers le fichier.
	 */
	public function isHomeFolder() {
		return preg_match('#^/home/#', $this->path());
	}

	/**
	 * Determiner si un fichier est contenu dans le repertoire personnel de l'utilisateur courant.
	 * @return bool Vrai si le fichier est dans le repertoire personnel de l'utilisateur.
	 */
	public function isUserFolder() {
		return preg_match('#^~#', $this->path());
	}

	/**
	 * Convertir un objet FileBase en chaine de caracteres.
	 * @return string Le chemin vers ce fichier.
	 */
	public function __toString() {
		return $this->path();
	}

	/**
	 * Recuperer le type MIME du fichier.
	 * @return string Le type MIME du fichier.
	 */
	public function mime() {
		$finfo = new \finfo(FILEINFO_MIME);
		if (!$finfo) { //Echec de l'ouverture de la BDD de finfo
			return 'application/octet-stream';
		}
		return $finfo->file($this->realpath());
	}

	// SETTERS
	/**
	 * Changer le mode (droits d'acces) du fichier.
	 * @return FileBase Le fichier.
	 */
	public function chmod($mod) {
		if (!chmod($this->realpath(), $mod))
			throw new \RuntimeException('Impossible de changer le mode de "'.$this->path().'" en "'.$mod.'"');

		return $this;
	}

	/**
	 * Copier ce fichier.
	 * @param string $dest Le dossier de destination.
	 * @return FileBase Le fichier copie.
	 */
	abstract public function copy($dest);

	/**
	 * Deplacer ce fichier.
	 * @param string $dest Le dossier de destination.
	 * @return FileBase Le fichier deplace.
	 */
	abstract public function move($dest);

	/**
	 * Supprimer le fichier.
	 */
	abstract public function delete();

	/**
	 * Compresser le fichier avec zip.
	 * @param string|array|bool $dest Le fichier de destination.
	 * @return FileBase|ZipArchive Le fichier zip.
	 */
	abstract public function zip($dest = false);
}