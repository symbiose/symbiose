<?php
namespace lib\entities;

use \InvalidArgumentException;

class AppLauncher extends \lib\Entity {
	protected $name, $title, $description, $command, $icon, $category;

	// SETTERS

	public function setName($name) {
		if (!is_string($name) || empty($name)) {
			throw new InvalidArgumentException('Invalid app launcher name "'.$name.'"');
		}

		$this->name = $name;
	}

	public function setTitle($title) {
		if (!is_string($title) || empty($title)) {
			throw new InvalidArgumentException('Invalid app launcher title "'.$title.'"');
		}

		$this->title = $title;
	}

	public function setDescription($description) {
		if (!is_string($description)) {
			throw new InvalidArgumentException('Invalid app launcher description "'.$description.'"');
		}

		$this->description = $description;
	}

	public function setCommand($command) {
		if (!is_string($command) || empty($command)) {
			throw new InvalidArgumentException('Invalid app launcher command "'.$command.'"');
		}

		$this->command = $command;
	}

	public function setIcon($icon) {
		if (!is_string($icon)) {
			throw new InvalidArgumentException('Invalid app launcher icon "'.$icon.'"');
		}

		$this->icon = $icon;
	}

	public function setCategory($category) {
		if (!is_string($category)) {
			throw new InvalidArgumentException('Invalid app launcher category "'.$category.'"');
		}

		$this->category = $category;
	}

	// GETTERS

	public function name() {
		return $this->name;
	}

	public function title() {
		return $this->title;
	}

	public function description() {
		return $this->description;
	}

	public function command() {
		return $this->command;
	}

	public function icon() {
		return $this->icon;
	}

	public function category() {
		return $this->category;
	}
}