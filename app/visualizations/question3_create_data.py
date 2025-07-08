import json
import networkx as nx
import numpy as np
import geopandas as gpd
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
import os

from math import radians, sin, cos, sqrt, atan2
    
class KB:
    def __init__(self, kb_path):
        kb = self.load_json(kb_path)
        self.nodes, self.links = self.preprocess_kb(kb)

    def load_json(self, file_path):
        with open(file_path, 'r') as f:
            return json.load(f)

    def preprocess_kb(self, kb):
        nodes = pd.DataFrame(kb['nodes'])
        links = pd.DataFrame(kb['links'])

        nodes['type'] = nodes['type'].fillna('nan')

        unique_node_types = nodes['type'].unique()
        entities_ids = {}
        for node_type in unique_node_types: 
            node_type_df = nodes[nodes['type'] == node_type]
            entities_ids[str(node_type)] = node_type_df['id'].unique().tolist()

        def get_entity_type_from_id(id):
            for node_type in entities_ids:
                if id in entities_ids[node_type]:
                    return node_type
            return None

        source_types = []
        target_types = []
        for link in links.itertuples():
            source = link.source
            target = link.target

            source_type = get_entity_type_from_id(source)
            target_type = get_entity_type_from_id(target)

            source_types.append(source_type)
            target_types.append(target_type)

        links['source_type'] = source_types
        links['target_type'] = target_types
        return nodes, links
    
    def get_nodes_type(self, node_type):
        return self.nodes[self.nodes['type'] == node_type].copy().dropna(axis=1, how='all')
    
    def get_edges_type(self, edge_type, source_nodes = None, target_nodes = None):
        filtered_links = self.links[
            (self.links['source_type'] == edge_type[0]) &
            (self.links['target_type'] == edge_type[1])
        ]
        if source_nodes:
            filtered_links = filtered_links[filtered_links['source'].isin(source_nodes)]
        if target_nodes:
            filtered_links = filtered_links[filtered_links['target'].isin(target_nodes)]
        return filtered_links.copy().dropna(axis=1, how='all')

    def get_parents(self, edge_type, node_values = None):
        filtered_links = self.links[
            (self.links['source_type'] == edge_type[0]) &
            (self.links['target_type'] == edge_type[1])
        ]
        if node_values:
            filtered_links = filtered_links[filtered_links['target'].isin(node_values)]
        return self.nodes[self.nodes['id'].isin(filtered_links['source'])].copy().dropna(axis=1, how='all')
    
    def get_children(self, edge_type, node_values = None):
        filtered_links = self.links[
            (self.links['source_type'] == edge_type[0]) &
            (self.links['target_type'] == edge_type[1])
        ]
        if node_values:
            filtered_links = filtered_links[filtered_links['source'].isin(node_values)]
        return self.nodes[self.nodes['id'].isin(filtered_links['target'])].copy().dropna(axis=1, how='all')
    

root = '../data/'

journalist_kb = KB(os.path.join(root, 'journalist.json'))
filah_kb = KB(os.path.join(root, 'FILAH.json'))
trout_kb = KB(os.path.join(root, 'TROUT.json'))

topics_map = {
    'Expanding the tourist wharf/infrastructure in Haacklee': 'tourism',
    'Statue to honor John Smoth in Port Grove': 'tourism',
    'Deep maintenance to the commercial fishing dock at Himark': 'fishing',
    'Money for a new crane at Lomark': 'fishing',
    'Fish Vacuum': 'fishing',
    'Low-volume unload crane in Haacklee': 'fishing',
    'Affordable housing for fishing workers (conflict with short-term rentals)': 'fishing',
    'Renaming a park in Himark': 'tourism',
    'Putting a name on pictureque harbor area in Port Grove': 'tourism',
    'Putting a name on the inspection office in Lomark': 'tourism',
    'Establishing a Marine Life Observation Deck in Centralia': 'tourism',
    'Hosting an Annual Seafood Festival in Paackland': 'tourism',
    'Developing a Heritage Walking Tour in Haacklee': 'tourism',
    'Establishing a Waterfront Market in Haacklee': 'fishing',
    'Plan for Concert': 'tourism',
}

kb = journalist_kb

n_topics = kb.get_nodes_type('topic')
n_topics['group'] = n_topics['long_topic'].map(topics_map)
n_persons = kb.get_nodes_type('entity.person')
n_discussions = kb.get_nodes_type('discussion')
n_plans = kb.get_nodes_type('plan').merge(
    kb.get_edges_type(('plan', 'topic'))[['source', 'target']],
    left_on='id',
    right_on='source'
).rename(columns={'target': 'topic'}).drop(columns=['source'])

e_discussions_plans = kb.get_edges_type(('discussion', 'plan'))
e_discussions_plans['status'] = e_discussions_plans['status'].str.lower()
e_discussions_persons = kb.get_edges_type(('discussion', 'entity.person'))
e_plans_persons = kb.get_edges_type(('plan', 'entity.person'))

n_discussions = n_discussions.merge(
    e_discussions_plans[['source', 'status']],
    left_on='id',
    right_on='source',
    how='left'
).drop(columns=['source'])

e_discussions_plans = e_discussions_plans.rename(columns={
    'target': 'plan_id',
    'source': 'discussion_id'
}).merge(
    kb.get_edges_type(('plan', 'topic'))[['source', 'target']],
    left_on='plan_id',
    right_on='source'
).rename(columns={'target': 'topic_id'}).drop(columns=['source'])

n_plans['plan_type'] = n_plans['plan_type'].str.lower()
e_plans_persons = e_plans_persons.merge(
    n_plans[['id', 'plan_type']],
    left_on='source',
    right_on='id',
    how='left'
).drop(columns=['id'])

e_discussions_plans = e_discussions_plans.merge(
    n_plans[['id', 'plan_type']],
    left_on='plan_id',
    right_on='id',
    how='left'
).drop(columns=['id'])

# Iterate over topic, creating id for each plan
for topic_id in e_discussions_plans['topic_id'].unique():
    topic_plans = e_discussions_plans[e_discussions_plans['topic_id'] == topic_id]
    plan_order_map = {plan_id: i for i, plan_id in enumerate(topic_plans.drop_duplicates(subset=['plan_id'])['plan_id'].values)}
    e_discussions_plans.loc[
        topic_plans.index,
        'plan_order'
    ] = e_discussions_plans.loc[
        topic_plans.index,
        'plan_id'
    ].map(plan_order_map)
e_discussions_plans['plan_order'] = e_discussions_plans['plan_order'].astype(int)

# Iterate over plan, creating id for each discussion
for plan_id in e_discussions_plans['plan_id'].unique():
    plan_discussions = e_discussions_plans[e_discussions_plans['plan_id'] == plan_id]
    discussion_order_map = {discussion_id: i for i, discussion_id in enumerate(plan_discussions.drop_duplicates(subset=['discussion_id'])['discussion_id'].values)}
    e_discussions_plans.loc[
        plan_discussions.index,
        'discussion_order'
    ] = e_discussions_plans.loc[
        plan_discussions.index,
        'discussion_id'
    ].map(discussion_order_map)
e_discussions_plans['discussion_order'] = e_discussions_plans['discussion_order'].astype(int)

for df in [e_discussions_persons, e_plans_persons]:
    df['sentiment'] = df['sentiment'].fillna(0)
    df['reason'] = df['reason'].fillna('')
    df['industry'] = df['industry'].apply(lambda x: [] if x is None else x)

data_discussions = []
for person_id in n_persons['id'].values:
    for topic_id in n_topics['id'].values:
        plans_topic = n_plans[n_plans['topic'] == topic_id]
        e_discussions_plans_topic = e_discussions_plans[e_discussions_plans['plan_id'].isin(plans_topic['id'].tolist())]
        for discussion_id, plan_id, discussion_order, plan_order, status in e_discussions_plans_topic[['discussion_id', 'plan_id', 'discussion_order', 'plan_order', 'status']].values:
            discussion_info = e_discussions_persons[(e_discussions_persons['source'] == discussion_id) & (e_discussions_persons['target'] == person_id)]

            data_square = {
                'person_id': person_id,
                'topic_id': topic_id,
                'plan_id': plan_id,
                'plan_order': plan_order,
                'discussion_id': discussion_id,
                'discussion_order': discussion_order,
                'discussion_info': discussion_info.to_dict(orient='records'),
                'discussion_status': status,
                'absent': discussion_info.empty,
            }
            data_discussions.append(data_square)

data_plans = []
for person_id in n_persons['id'].values:
    for topic_id in n_topics['id'].values:
        plans_topic = n_plans[n_plans['topic'] == topic_id]
        e_discussions_plans_topic = e_discussions_plans[e_discussions_plans['plan_id'].isin(plans_topic['id'].tolist())]
        e_discussions_plans_topic = e_discussions_plans_topic.drop_duplicates(subset=['plan_id'])
        for plan_id, plan_order, plan_type in e_discussions_plans_topic[['plan_id', 'plan_order', 'plan_type']].values:
            plan_info = e_plans_persons[(e_plans_persons['source'] == plan_id) & (e_plans_persons['target'] == person_id)]

            data_square = {
                'person_id': person_id,
                'topic_id': topic_id,
                'plan_id': plan_id,
                'plan_order': plan_order,
                'plan_type': plan_type,
                'plan_info': plan_info.to_dict(orient='records'),
                'absent': plan_info.empty,
            }
            data_plans.append(data_square)

data_persons = n_persons.to_dict(orient='records')
data_topics = n_topics.sort_values(by='group').to_dict(orient='records')

with open('data.json', 'w') as f:
    json.dump({
        'discussions': data_discussions,
        'plans': data_plans,
        'persons': data_persons,
        'topics': data_topics
    }, f, indent=4)