import random
from pathlib import Path
from deap import base, creator, gp, tools, algorithms
from .primitives import pset
from . import utils, fitness
from .export_rule import export

ROOT = Path(__file__).resolve().parents[1]

in_data = utils.load_data(ROOT / 'data' / 'EURUSD_M15_in.csv')

creator.create('FitnessMax', base.Fitness, weights=(1.0,))
creator.create('Individual', gp.PrimitiveTree, fitness=creator.FitnessMax, pset=pset)

toolbox = base.Toolbox()
toolbox.register('expr', gp.genHalfAndHalf, pset=pset, min_=1, max_=2)
toolbox.register('individual', tools.initIterate, creator.Individual, toolbox.expr)
toolbox.register('population', tools.initRepeat, list, toolbox.individual)

toolbox.register('compile', gp.compile, pset=pset)
toolbox.register('evaluate', fitness.evaluate, data=in_data)
toolbox.register('select', tools.selTournament, tournsize=3)
toolbox.register('mate', gp.cxOnePoint)
toolbox.register('mutate', gp.mutUniform, expr=toolbox.expr, pset=pset)

toolbox.decorate('mate', gp.staticLimit(key=len, max_value=17))
toolbox.decorate('mutate', gp.staticLimit(key=len, max_value=17))


def main():
    pop = toolbox.population(n=200)
    hof = tools.HallOfFame(1)
    algorithms.eaSimple(pop, toolbox, 0.5, 0.2, 40, halloffame=hof, verbose=True)

    best = hof[0]
    (ROOT / 'gp' / 'best_tree.txt').write_text(str(best))
    export(best, ROOT / 'mql5' / 'gp_rule.mqh')

if __name__ == '__main__':
    main()
