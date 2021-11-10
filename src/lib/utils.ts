export function objectToArgs(config:object) {
	return Object.entries(config).reduce<string[]>((args, [key, value]) => {
		let new_args = [`-${key}`]
		if (value !== undefined) new_args.push(value)
		return args.concat(new_args)
	}, [])
}