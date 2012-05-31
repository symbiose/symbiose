<?php
namespace lib\controllers;

/**
 * FileController permet de controller l'ensemble des fichiers.
 * @author $imon
 * @version 1.0
 *
 */
class FileController extends \lib\ServerCallComponent {
	/**
	 * Recuperer le contenu d'un fichier.
	 * @param string $file le fichier.
	 */
	protected function getContents($file) {
		$file = $this->webos->managers()->get('File')->get($file);
		if ($file->isDir()) {
			$contents = $file->contents();
			$list = array();
			foreach($contents as $file) {
				$list[$file->basename()] = $this->getData($file->path());
			}
			return $list;
		} else {
			return $file->contents();
		}
	}

	/**
	 * Recuperer les informations sur un fichier.
	 * @param string $file Le fichier.
	 */
	protected function getData($path) {
		$file = $this->webos->managers()->get('File')->get($path);
		$data = array(
			'basename' => $file->basename(),
			'path' => $file->path(),
			'realpath' => $file->realpath(),
			'dirname' => $file->dirname(),
			'atime' => $file->atime(),
			'mtime' => $file->mtime(),
			'size' => $file->size(),
			'is_dir' => $file->isDir()
		);
		if (!$file->isDir()) {
			$data['extension'] = $file->extension();
		}
		return $data;
	}

	/**
	 * Renommer un fichier.
	 * @param string $file Le chemin vers le fichier.
	 * @param string $newName Le nouveau nom du fichier.
	 */
	protected function rename($path, $newName) {
		if (preg_match('#/#', $newName))
			throw new \InvalidArgumentException('Impossible de renommer "'.$path.'" en "'.$newName.'" : nom de fichier incorrect');

		$file = $this->webos->managers()->get('File')->get($path);
		$parent = $this->webos->managers()->get('File')->get($file->dirname());
		$newPath = $parent->relativePath($newName);

		if (!$this->webos->managers()->get('File')->exists($file->dirname()))
			throw new \InvalidArgumentException('Impossible de renommer "'.$path.'" en "'.$newName.'" : ce nom de fichier est d&eacute;j&agrave; utilis&eacute;');

		$file->move($newPath);
	}

	/**
	 * Deplacer un fichier.
	 * @param string $old Le chemin vers le fichier a deplacer.
	 * @param string $new Le nouveau chemin du fichier, ou le chemin du dossier ou le fichier sera deplace.
	 */
	protected function move($old, $new) {
		$this->webos->managers()->get('File')->get($old)->move($new);
	}

	/**
	 * Supprimer un fichier.
	 * @param string $file Le fichier a supprimer.
	 */
	protected function delete($file) {
		$this->webos->managers()->get('File')->get($file)->delete();
	}

	/**
	 * Creer un fichier vierge et renvoyer les informations sur le fichier cree.
	 * @param string $path Le chemin vers le fichier a creer.
	 */
	protected function createFile($path) {
		$this->webos->managers()->get('File')->createFile($path);
		return $this->getData($path);
	}

	/**
	 * Creer un dossier et renvoyer les informations sur le dossier cree.
	 * @param string $path Le chemin vers le dossier a creer.
	 */
	protected function createFolder($path) {
		$this->webos->managers()->get('File')->createDir($path);
		return $this->getData($path);
	}

	/**
	 * Definir le contenu d'un fichier.
	 * @param string $path Le chemin vers le fichier a modifier.
	 * @param string $contents Le nouveau contenu du fichier.
	 */
	protected function setContents($path, $contents) {
		$this->webos->managers()->get('File')->get($path)->setContents($contents);
	}

	/**
	 * Envoyer un fichier sur le serveur.
	 * @param string $dest Le dossier de destination.
	 * @return array Un tableau contenant des informations sur le traitement : "success" vaut faux si une erreur est survenue, dans ce cas "message" contient le message d\'erreur.
	 */
	protected function upload($dest) {
		//La destination existe-t-elle ?
		if (!$this->webos->managers()->get('File')->exists($dest)) {
			return array('success' => false, 'msg' => 'Dossier de destination inexistant');
		}

		$dest = $this->webos->managers()->get('File')->get($dest);
		if (!$dest->isDir()) { //La destination est-elle un dossier ?
			return array('success' => false, 'msg' => 'Dossier de destination incorrect');
		}

		if ($this->webos->getHTTPRequest()->getExists('file')) {
			$input = fopen('php://input', 'r');
			$tempName = 'tmp/'.$this->webos->getHTTPRequest()->getData('file');
			$temp = fopen($tempName, 'w');
			$realSize = stream_copy_to_stream($input, $temp);
			fclose($input);

			$_FILES['file'] = array(
				'error' => 0,
				'name' => $this->webos->getHTTPRequest()->getData('file'),
				'size' => $realSize,
				'tmp_name' => $tempName
			);
		}

		//Un fichier a-t-il ete envoye ?
		if (!isset($_FILES['file'])) {
			return array('success' => false, 'msg' => 'Aucun fichier s&eacute;l&eacute;ctionn&eacute;');
		}

		//Y a-t-il une erreur ?
		if ($_FILES['file']['error'] > 0) {
			switch($_FILES['file']['error']) {
				case UPLOAD_ERR_NO_FILE:
					$msg = 'Aucun fichier s&eacute;l&eacute;ctionn&eacute;';
					break;
				case UPLOAD_ERR_INI_SIZE:
				case UPLOAD_ERR_FORM_SIZE:
					$msg = 'Taille du fichier trop importante';
					break;
				case UPLOAD_ERR_PARTIAL:
					$msg = 'Transfert interrompu';
					break;
				default:
					$msg = 'Une erreur est survenue pendant le transfert';
			}
			return array('success' => false, 'msg' => $msg);
		}

		/*
		// La taille max est-elle ateinte ?
		if ($_FILES['file']['size'] > $maxsize) {
			return array('success' => false, 'msg' => 'Taille du fichier trop importante');
		}*/

		//L'espace disponible est-il assez important ?
		try {
			$this->webos->managers()->get('File')->checkAvailableSpace($dest, $_FILES['file']['size']);
		} catch (Exception $e) {
			if (isset($tempName)) {
				unlink($tempName);
			}
			return array('success' => false, 'msg' => $e->getMessage());
		}

		//Le type de fichier est-il autorise ?
		$allowedExts = array('jpg' , 'jpeg' , 'gif' , 'png', 'pdf');
		$extension = strtolower(substr(strrchr($_FILES['file']['name'], '.'), 1));
		if (!in_array($extension, $allowedExts)) {
			if (isset($tempName)) {
				unlink($tempName);
			}
			return array('success' => false, 'msg' => 'Type de fichier non autoris&eacute;');
		}

		//Correction du nom de fichier de destination s'il existe
		$path = $dest.'/'.$_FILES['file']['name'];
		$filename = preg_replace('#\.'.$extension.'$#', '', $_FILES['file']['name']);
		$i = 2;

		while($this->webos->managers()->get('File')->exists($path)) { //Tant que le fichier existe, on choisi un autre nom
			$path = $dest.'/'.$filename.'-'.$i.'.'.$extension;
			$i++;
		}

		//Copie
		$result = copy($_FILES['file']['tmp_name'], $dest->realpath($path));

		if (isset($tempName)) {
			unlink($tempName);
		}

		if (!$result) { //Si une erreur est survenue
			return array('success' => false, 'msg' => 'Erreur lors de la copie');
		}

		//Changement du mode du fichier
		$file = $this->webos->managers()->get('File')->get($path);
		$file->chmod(0777);

		//Renvoi des infos
		return array('success' => true, 'file' => $this->getData($path));
	}

	/**
	 * Declancher le telechargement d'un fichier.
	 * @param string $path Le fichier a telecharger.
	 */
	protected function download($path) {
		$file = $this->webos->managers()->get('File')->get($path);

		if ($file->isDir()) {
			$source = $file->zip('/tmp/'.sha1(time().'-'.rand()).'.zip');
		} else {
			$source = $file;
		}

		header('Content-Description: File Transfer');
		header('Content-Type: application/octet-stream');
		header('Content-Disposition: attachment; filename='.$file->basename());
		header('Content-Transfer-Encoding: binary');
		header('Expires: 0');
		header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
		header('Pragma: public');
		header('Content-Length: ' . filesize($source->realpath()));
		ob_end_clean();
		readfile($source->realpath());
		exit;
	}
}